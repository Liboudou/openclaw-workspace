/**
 * OpenClaw Session Watcher — Passive trace emitter
 * 
 * Watches the delivery-queue and subagents/runs.json for agent activity
 * and emits OpenTelemetry spans automatically, without modifying OpenClaw internals.
 * 
 * Run alongside the gateway:
 *   node observability/session-watcher.js
 * 
 * Requires tracing.js to be loaded first (via --require or explicit require).
 */

require("./tracing");

const fs = require("fs");
const path = require("path");
const { trace, SpanStatusCode } = require("@opentelemetry/api");

const tracer = trace.getTracer("openclaw-session-watcher");

const OPENCLAW_ROOT = path.resolve(__dirname, "..");
const RUNS_FILE = path.join(OPENCLAW_ROOT, "..", "subagents", "runs.json");
const DELIVERY_QUEUE = path.join(OPENCLAW_ROOT, "..", "delivery-queue");
const FAILED_QUEUE = path.join(DELIVERY_QUEUE, "failed");
const SESSION_DIRS = path.join(OPENCLAW_ROOT, "..", "agents");

// Track already-seen items to avoid duplicate spans
const seenRuns = new Set();
const seenDeliveries = new Set();
const seenSessions = new Map(); // agentId -> Set<sessionId>

// Active spans for agent runs (to create parent-child relationships)
const activeAgentSpans = new Map();

/**
 * Poll subagents/runs.json for new dispatches
 */
function watchRuns() {
  try {
    if (!fs.existsSync(RUNS_FILE)) return;
    
    const data = JSON.parse(fs.readFileSync(RUNS_FILE, "utf-8"));
    const runs = Array.isArray(data) ? data : (data.runs || []);

    for (const run of runs) {
      const key = run.id || run.sessionId || JSON.stringify(run);
      if (seenRuns.has(key)) continue;
      seenRuns.add(key);

      const span = tracer.startSpan(`dispatch:${run.agent || run.agentId || "unknown"}`);
      span.setAttribute("agent.id", run.agent || run.agentId || "unknown");
      span.setAttribute("agent.type", "sub");
      span.setAttribute("dispatch.id", key);
      
      if (run.status) span.setAttribute("dispatch.status", run.status);
      if (run.task) span.setAttribute("dispatch.task", truncate(run.task));
      if (run.input) span.setAttribute("dispatch.input", truncate(JSON.stringify(run.input)));
      if (run.output) span.setAttribute("dispatch.output", truncate(JSON.stringify(run.output)));
      if (run.startedAt) span.setAttribute("dispatch.started_at", run.startedAt);
      if (run.completedAt) span.setAttribute("dispatch.completed_at", run.completedAt);
      
      if (run.error) {
        span.recordException(new Error(typeof run.error === "string" ? run.error : JSON.stringify(run.error)));
        span.setStatus({ code: SpanStatusCode.ERROR });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      
      span.end();
      console.log(`[watcher] Traced dispatch → ${run.agent || run.agentId || "unknown"} (${key})`);
    }
  } catch (err) {
    // Ignore parse errors — file may be mid-write
  }
}

/**
 * Watch delivery-queue/failed for error traces
 */
function watchFailedDeliveries() {
  try {
    if (!fs.existsSync(FAILED_QUEUE)) return;

    const files = fs.readdirSync(FAILED_QUEUE).filter(f => f.endsWith(".json"));
    
    for (const file of files) {
      if (seenDeliveries.has(file)) continue;
      seenDeliveries.add(file);

      try {
        const data = JSON.parse(fs.readFileSync(path.join(FAILED_QUEUE, file), "utf-8"));
        
        const span = tracer.startSpan(`delivery:failed`);
        span.setAttribute("delivery.id", file.replace(".json", ""));
        span.setAttribute("delivery.status", "failed");
        
        if (data.error) span.setAttribute("delivery.error", truncate(JSON.stringify(data.error)));
        if (data.agent) span.setAttribute("agent.id", data.agent);
        if (data.channel) span.setAttribute("delivery.channel", data.channel);
        if (data.timestamp) span.setAttribute("delivery.timestamp", data.timestamp);
        
        span.recordException(new Error(data.error || "Delivery failed"));
        span.setStatus({ code: SpanStatusCode.ERROR, message: "delivery failed" });
        span.end();
        
        console.log(`[watcher] Traced failed delivery → ${file}`);
      } catch (parseErr) {
        // Skip unreadable files
      }
    }
  } catch (err) {
    // Ignore directory errors
  }
}

/**
 * Watch agent session directories for new sessions
 */
function watchAgentSessions() {
  try {
    if (!fs.existsSync(SESSION_DIRS)) return;

    const agents = fs.readdirSync(SESSION_DIRS).filter(d => {
      const sessDir = path.join(SESSION_DIRS, d, "sessions");
      return fs.existsSync(sessDir) && fs.statSync(sessDir).isDirectory();
    });

    for (const agentId of agents) {
      if (!seenSessions.has(agentId)) {
        seenSessions.set(agentId, new Set());
      }

      const sessDir = path.join(SESSION_DIRS, agentId, "sessions");
      let sessions;
      try {
        sessions = fs.readdirSync(sessDir);
      } catch { continue; }

      for (const sessionEntry of sessions) {
        if (seenSessions.get(agentId).has(sessionEntry)) continue;
        seenSessions.get(agentId).add(sessionEntry);

        const span = tracer.startSpan(`session:${agentId}`);
        span.setAttribute("agent.id", agentId);
        span.setAttribute("session.id", sessionEntry);
        span.setAttribute("session.path", path.join(sessDir, sessionEntry));

        // Try to read session metadata
        const metaPath = path.join(sessDir, sessionEntry, "metadata.json");
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
            if (meta.status) span.setAttribute("session.status", meta.status);
            if (meta.createdAt) span.setAttribute("session.created_at", meta.createdAt);
            if (meta.model) span.setAttribute("session.model", meta.model);
          } catch {}
        }

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        console.log(`[watcher] Traced session → ${agentId}/${sessionEntry}`);
      }
    }
  } catch (err) {
    // Ignore errors
  }
}

function truncate(str, maxLen = 4096) {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen) + "...[truncated]" : str;
}

// ─── Main loop ───

const POLL_INTERVAL_MS = parseInt(process.env.WATCHER_POLL_MS || "5000", 10);

console.log(`[watcher] OpenClaw Session Watcher started (poll every ${POLL_INTERVAL_MS}ms)`);
console.log(`[watcher] Monitoring:`);
console.log(`  - ${RUNS_FILE}`);
console.log(`  - ${FAILED_QUEUE}`);
console.log(`  - ${SESSION_DIRS}`);

// Initial scan
watchRuns();
watchFailedDeliveries();
watchAgentSessions();

// Polling loop
setInterval(() => {
  watchRuns();
  watchFailedDeliveries();
  watchAgentSessions();
}, POLL_INTERVAL_MS);
