/**
 * OpenClaw Live Dashboard — Server v2
 * 
 * Real-time visual dashboard with interactive controls.
 * Features: SSE streaming, gateway WS proxy (kill/purge/spawn), file activity.
 * 
 * Usage: node observability/dashboard.js
 * Then open: http://localhost:3200
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.DASHBOARD_PORT || "3200", 10);
const OPENCLAW_ROOT = path.resolve(__dirname, "..", "..");
const WORKSPACE = path.join(OPENCLAW_ROOT, "workspace");
const RUNS_FILE = path.join(OPENCLAW_ROOT, "subagents", "runs.json");
const LOG_DIR = path.join(process.env.LOCALAPPDATA || "", "Temp", "openclaw");
const AGENTS_CONFIG = path.join(OPENCLAW_ROOT, "openclaw.json");

// Gateway config (read from openclaw.json)
const GATEWAY_PORT = 18789;
const GATEWAY_HOST = "127.0.0.1";
let GATEWAY_TOKEN = "";
try {
  const cfg = JSON.parse(fs.readFileSync(AGENTS_CONFIG, "utf-8"));
  GATEWAY_TOKEN = cfg.gateway?.auth?.token || "";
} catch {}

// ─── Cost estimation (hybrid: openclaw SDK best-effort + fallback pricing) ───
// Fallback per-million token pricing (USD). Values track Claude 4.5/4.6 public pricing.
const FALLBACK_PRICING = {
  "claude-opus-4-6":    { input: 15,   output: 75,  cacheRead: 1.5,  cacheWrite: 18.75 },
  "claude-sonnet-4-6":  { input: 3,    output: 15,  cacheRead: 0.3,  cacheWrite: 3.75  },
  "claude-sonnet-4-5":  { input: 3,    output: 15,  cacheRead: 0.3,  cacheWrite: 3.75  },
  "claude-haiku-4-5":   { input: 1,    output: 5,   cacheRead: 0.1,  cacheWrite: 1.25  },
};

let openclawSdk = null;
let openclawResolveCost = null;
let openclawEstimateCost = null;
let openclawConfigCache = null;
let openclawConfigCacheAt = 0;

function pickFn(mod, names) {
  if (!mod) return null;
  for (const n of names) if (typeof mod[n] === "function") return mod[n];
  if (mod.default) for (const n of names) if (typeof mod.default[n] === "function") return mod.default[n];
  return null;
}

(async () => {
  const candidates = [
    "openclaw/plugin-sdk",
    path.join(process.env.APPDATA || "", "npm", "node_modules", "openclaw", "dist", "plugin-sdk", "index.js"),
  ].filter(Boolean);
  for (const target of candidates) {
    try {
      const url = target.startsWith("openclaw") ? target : "file://" + target.replace(/\\/g, "/");
      openclawSdk = await import(url);
      openclawResolveCost = pickFn(openclawSdk, ["resolveModelCostConfig", "i"]);
      openclawEstimateCost = pickFn(openclawSdk, ["estimateUsageCost", "t"]);
      if (openclawResolveCost && openclawEstimateCost) {
        console.log("  +  openclaw/plugin-sdk loaded (cost estimation enabled)");
        return;
      }
    } catch {}
  }
  console.log("  !  openclaw/plugin-sdk unavailable — using fallback pricing");
  openclawSdk = null;
  openclawResolveCost = null;
  openclawEstimateCost = null;
})();

function getOpenclawConfig() {
  const now = Date.now();
  if (openclawConfigCache && now - openclawConfigCacheAt < 5 * 60 * 1000) return openclawConfigCache;
  try {
    openclawConfigCache = JSON.parse(fs.readFileSync(AGENTS_CONFIG, "utf-8"));
    openclawConfigCacheAt = now;
  } catch {
    openclawConfigCache = null;
  }
  return openclawConfigCache;
}

function normalizeModelId(model) {
  if (!model) return null;
  return String(model).toLowerCase().replace(/-2025\d{4}$/, "").replace(/-\d{8}$/, "");
}

function computeCostUsd({ usage, provider, model }) {
  if (!usage) return undefined;
  const norm = normalizeModelId(model);
  if (openclawResolveCost && openclawEstimateCost) {
    try {
      const cost = openclawResolveCost({ provider, model, config: getOpenclawConfig() });
      if (cost) {
        const v = openclawEstimateCost({ usage, cost });
        if (typeof v === "number" && isFinite(v)) return v;
      }
    } catch {}
  }
  const price = norm && FALLBACK_PRICING[norm];
  if (!price) return undefined;
  const inp = Number(usage.input || 0);
  const out = Number(usage.output || 0);
  const cr  = Number(usage.cacheRead || 0);
  const cw  = Number(usage.cacheWrite || 0);
  return (inp * price.input + out * price.output + cr * price.cacheRead + cw * price.cacheWrite) / 1e6;
}

// ─── Agent metadata ───
const AGENT_META = {
  main:      { name: "Main (CTO)",   icon: "\u{1F99E}", color: "#ef4444", role: "Orchestrator" },
  conductor: { name: "Conductor",    icon: "\u{1F3BC}", color: "#8b5cf6", role: "Orchestrator" },
  architect: { name: "Strut",        icon: "\u{1F3D7}\uFE0F", color: "#3b82f6", role: "Architect" },
  coder:     { name: "Hex",          icon: "\u{1F4BB}", color: "#22c55e", role: "Coder" },
  tester:    { name: "Check",        icon: "\u2705", color: "#10b981", role: "Tester" },
  reviewer:  { name: "Lens",         icon: "\u{1F50D}", color: "#a855f7", role: "Reviewer" },
  planner:   { name: "Atlas",        icon: "\u{1F5FA}\uFE0F", color: "#f59e0b", role: "Planner" },
  senior:    { name: "Forge",        icon: "\u{2692}\uFE0F", color: "#ec4899", role: "Senior Dev" },
  data:      { name: "Qubit",        icon: "\u{1F5C4}\uFE0F", color: "#06b6d4", role: "Data Engineer" },
  designer:  { name: "Iris",         icon: "\u{1F3A8}", color: "#f97316", role: "Designer" },
  security:  { name: "Vault",        icon: "\u{1F6E1}\uFE0F", color: "#64748b", role: "Security" },
  finance:   { name: "Quant",        icon: "\u{1F4C8}", color: "#14b8a6", role: "Finance" },
};

// ─── SSE clients ───
const sseClients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

// ─── Data loading ───

function loadRuns() {
  try {
    if (!fs.existsSync(RUNS_FILE)) return {};
    return JSON.parse(fs.readFileSync(RUNS_FILE, "utf-8")).runs || {};
  } catch { return {}; }
}

function getAgentFromSessionKey(key) {
  const m = key && key.match(/^agent:([^:]+):/);
  return m ? m[1] : null;
}

function parseRuns() {
  const raw = loadRuns();
  const runs = [];
  for (const [id, run] of Object.entries(raw)) {
    runs.push({
      id: run.runId,
      sessionKey: run.childSessionKey || id,
      controllerKey: run.controllerSessionKey || null,
      agent: getAgentFromSessionKey(run.childSessionKey),
      parent: getAgentFromSessionKey(run.controllerSessionKey),
      parentSessionKey: run.controllerSessionKey || null,
      task: run.task || "",
      status: run.outcome?.status || (run.endedAt ? "completed" : "running"),
      error: run.outcome?.error || null,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      endedAt: run.endedAt || null,
      durationMs: run.endedAt ? (run.endedAt - run.startedAt) : (Date.now() - run.startedAt),
      endedReason: run.endedReason || null,
      model: run.model || null,
    });
  }
  runs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return runs;
}

// ─── Token usage parsing from session JSONL ───
const readline = require("readline");
const tokenUsageCache = new Map(); // "agent:startedAt" → { input, output, total }

// Build index: for each agent, map session start timestamp → file path
const sessionIndexCache = new Map(); // agentId → [{ts, file}]
let sessionIndexAge = 0;

function getAgentSessionIndex(agentId) {
  const now = Date.now();
  if (now - sessionIndexAge < 30000 && sessionIndexCache.has(agentId)) return sessionIndexCache.get(agentId);
  const sessDir = path.join(OPENCLAW_ROOT, "agents", agentId, "sessions");
  if (!fs.existsSync(sessDir)) return [];
  const entries = [];
  try {
    for (const name of fs.readdirSync(sessDir)) {
      if (!name.endsWith(".jsonl")) continue;
      const fp = path.join(sessDir, name);
      try {
        const fd = fs.openSync(fp, "r");
        const buf = Buffer.alloc(256);
        fs.readSync(fd, buf, 0, 256, 0);
        fs.closeSync(fd);
        const firstLine = buf.toString("utf-8").split("\n")[0];
        const hdr = JSON.parse(firstLine);
        if (hdr.timestamp) entries.push({ ts: new Date(hdr.timestamp).getTime(), file: fp });
      } catch {}
    }
  } catch {}
  entries.sort((a, b) => a.ts - b.ts);
  sessionIndexCache.set(agentId, entries);
  if (!sessionIndexCache.has("__refreshed")) sessionIndexAge = now;
  return entries;
}
// Refresh index periodically
setInterval(() => { sessionIndexCache.clear(); sessionIndexAge = 0; }, 30000);

function getSessionFile(sessionKey, startedAt) {
  const m = sessionKey && sessionKey.match(/^agent:([^:]+):/);
  if (!m) return null;
  const agentId = m[1];
  const index = getAgentSessionIndex(agentId);
  if (!index.length) return null;
  // Find session file with closest timestamp (within 2s of run startedAt)
  let bestFile = null, bestDiff = Infinity;
  for (const entry of index) {
    const diff = Math.abs(entry.ts - startedAt);
    if (diff < bestDiff) { bestDiff = diff; bestFile = entry.file; }
  }
  return bestDiff < 2000 ? bestFile : null;
}

function getTokenUsage(sessionKey, startedAt, modelRef) {
  const cacheKey = sessionKey + ":" + startedAt;
  if (tokenUsageCache.has(cacheKey)) return tokenUsageCache.get(cacheKey);
  const file = getSessionFile(sessionKey, startedAt);
  if (!file) return null;
  try {
    const content = fs.readFileSync(file, "utf-8");
    let input = 0, output = 0, cacheRead = 0, cacheWrite = 0, total = 0;
    let detectedModel = modelRef || null;
    let detectedProvider = null;
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (!detectedModel) {
          detectedModel = entry.message?.model || entry.model || entry.header?.model || null;
        }
        if (!detectedProvider) {
          detectedProvider = entry.provider || entry.message?.provider || entry.header?.provider || null;
        }
        const usage = entry.message?.usage || entry.usage;
        if (usage) {
          input += usage.input || usage.prompt_tokens || usage.input_tokens || 0;
          output += usage.output || usage.completion_tokens || usage.output_tokens || 0;
          cacheRead += usage.cacheRead || usage.cache_read_input_tokens || 0;
          cacheWrite += usage.cacheWrite || usage.cache_creation_input_tokens || 0;
          total += usage.totalTokens || (usage.input || 0) + (usage.output || 0);
        }
      } catch {}
    }
    if (total === 0 && input === 0) return null;
    const usage = { input, output, cacheRead, cacheWrite };
    const costUsd = computeCostUsd({ usage, provider: detectedProvider, model: detectedModel });
    const result = { input, output, cacheRead, cacheWrite, total, costUsd, model: detectedModel };
    tokenUsageCache.set(cacheKey, result);
    return result;
  } catch { return null; }
}

// Clear token cache periodically
setInterval(() => tokenUsageCache.clear(), 60000);

function buildAgentGraph(runs) {
  // Aggregate parent->child edges. For each (parent,child) pair, remember
  // the most recent run time and frequency to pick a stable primary parent.
  const agentsSeen = new Set();
  const edgeStats = new Map(); // key "parent>child" -> { parent, child, last, count }
  for (const run of runs) {
    const child = run.agent;
    if (!child || !AGENT_META[child]) continue;
    agentsSeen.add(child);
    const parent = run.parent && AGENT_META[run.parent] ? run.parent : null;
    if (parent) {
      agentsSeen.add(parent);
      const key = parent + ">" + child;
      const prev = edgeStats.get(key);
      const last = run.createdAt || run.startedAt || 0;
      if (!prev) edgeStats.set(key, { parent, child, last, count: 1 });
      else { prev.count++; if (last > prev.last) prev.last = last; }
    }
  }
  // Build primary-parent map: for each child pick one parent (most recent, tie-break on count)
  const candidates = new Map(); // child -> [edgeStats]
  for (const e of edgeStats.values()) {
    if (!candidates.has(e.child)) candidates.set(e.child, []);
    candidates.get(e.child).push(e);
  }
  const primaryParent = new Map();
  for (const [child, list] of candidates.entries()) {
    list.sort((a, b) => (b.last - a.last) || (b.count - a.count));
    primaryParent.set(child, list[0].parent);
  }
  // Break cycles: walk up, if we revisit, drop the edge.
  const safeParent = new Map();
  for (const child of agentsSeen) {
    let cur = child;
    const seen = new Set([cur]);
    let p = primaryParent.get(cur);
    let ok = true;
    while (p) {
      if (seen.has(p)) { ok = false; break; }
      seen.add(p);
      cur = p;
      p = primaryParent.get(cur);
    }
    if (ok) safeParent.set(child, primaryParent.get(child) || null);
    else safeParent.set(child, null); // drop to root on cycle
  }
  // Build nodes & edges
  const nodes = {};
  for (const id of agentsSeen) nodes[id] = { id, ...AGENT_META[id] };
  const edges = [];
  for (const [child, parent] of safeParent.entries()) {
    if (parent) edges.push({ from: parent, to: child });
  }
  // Roots: agents with no parent in safeParent
  const roots = [];
  for (const id of agentsSeen) if (!safeParent.get(id)) roots.push(id);
  return { nodes, edges, roots: roots.sort() };
}

function getAgentStates(runs) {
  const states = {};
  for (const [id, meta] of Object.entries(AGENT_META)) {
    states[id] = { ...meta, id, status: "idle", currentTask: null, lastSeen: null, runCount: 0, errorCount: 0, activeSessionKeys: [] };
  }
  for (const run of runs) {
    const aid = run.agent;
    if (!aid || !states[aid]) continue;
    states[aid].runCount++;
    if (run.error) states[aid].errorCount++;
    if (!run.endedAt) {
      states[aid].status = "working";
      states[aid].currentTask = run.task;
      states[aid].activeSessionKeys.push(run.sessionKey);
    }
    if (!states[aid].lastSeen || run.createdAt > states[aid].lastSeen) {
      states[aid].lastSeen = run.createdAt;
    }
  }
  return states;
}

// ─── Gateway WebSocket Client ───
let gatewayWs = null;
let gatewayConnected = false;
let gwReqId = 1;
const gwPending = new Map();

function connectGateway() {
  if (!GATEWAY_TOKEN) {
    console.log("  !  No gateway token, WS proxy disabled");
    return;
  }
  try {
    gatewayWs = new WebSocket(`ws://${GATEWAY_HOST}:${GATEWAY_PORT}`, {
      headers: { Origin: `http://${GATEWAY_HOST}:${GATEWAY_PORT}` }
    });
  } catch (err) {
    console.log("  !  WebSocket unavailable:", err.message);
    setTimeout(connectGateway, 10000);
    return;
  }

  gatewayWs.addEventListener("open", () => {
    // Gateway sends connect.challenge first, we wait for it
  });

  gatewayWs.addEventListener("message", (event) => {
    try {
      const raw = typeof event.data === "string" ? event.data : event.data.toString();
      const msg = JSON.parse(raw);

      // Handle connect.challenge → send connect request
      if (msg.type === "event" && msg.event === "connect.challenge") {
        const connectFrame = {
          type: "req",
          id: String(gwReqId++),
          method: "connect",
          params: {
            client: {
              id: "openclaw-control-ui",
              displayName: "OpenClaw Dashboard",
              mode: "ui",
              version: "2.0",
              platform: process.platform
            },
            minProtocol: 3,
            maxProtocol: 3,
            auth: { token: GATEWAY_TOKEN },
            scopes: ["operator.read", "operator.write", "operator.admin"]
          }
        };
        gatewayWs.send(JSON.stringify(connectFrame));
        return;
      }

      // Handle connect response
      if (msg.type === "res" && msg.ok && msg.payload?.type === "hello-ok") {
        gatewayConnected = true;
        console.log("  +  Gateway WebSocket connected (protocol " + msg.payload.protocol + ")");
        broadcast("gateway", { connected: true });
        // Resolve any pending promise for this id
        if (msg.id != null && gwPending.has(msg.id)) {
          gwPending.get(msg.id).resolve(msg.payload);
          gwPending.delete(msg.id);
        }
        return;
      }

      // Handle error response to connect
      if (msg.type === "res" && !msg.ok && !gatewayConnected) {
        console.log("  !  Gateway connect rejected:", msg.error?.message || JSON.stringify(msg.error));
        return;
      }

      // Handle RPC responses
      if (msg.type === "res" && msg.id != null && gwPending.has(msg.id)) {
        const { resolve, reject } = gwPending.get(msg.id);
        gwPending.delete(msg.id);
        if (msg.ok) resolve(msg.payload ?? msg.result);
        else reject(msg.error);
        return;
      }

      // Real-time events from gateway
      if (msg.type === "event" && msg.event) {
        broadcast("gateway_event", { event: msg.event, payload: msg.payload });
      }
    } catch {}
  });

  gatewayWs.addEventListener("close", () => {
    gatewayConnected = false;
    console.log("  -  Gateway WebSocket disconnected, reconnecting in 5s...");
    broadcast("gateway", { connected: false });
    setTimeout(connectGateway, 5000);
  });

  gatewayWs.addEventListener("error", () => {});
}

function gwRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!gatewayWs || !gatewayConnected) {
      return reject({ code: -1, message: "Gateway not connected" });
    }
    const id = String(gwReqId++);
    gwPending.set(id, { resolve, reject });
    try {
      gatewayWs.send(JSON.stringify({ type: "req", id, method, params }));
    } catch (err) {
      gwPending.delete(id);
      return reject({ code: -3, message: err.message });
    }
    setTimeout(() => {
      if (gwPending.has(id)) {
        gwPending.delete(id);
        reject({ code: -2, message: "Request timeout (30s)" });
      }
    }, 30000);
  });
}

// ─── Fallback: direct runs.json manipulation ───

function directDeleteRun(sessionKey) {
  try {
    const data = JSON.parse(fs.readFileSync(RUNS_FILE, "utf-8"));
    const runs = data.runs || {};
    let deleted = false;
    for (const [id, run] of Object.entries(runs)) {
      if (run.childSessionKey === sessionKey || id === sessionKey) {
        delete runs[id];
        deleted = true;
        break;
      }
    }
    if (deleted) {
      fs.writeFileSync(RUNS_FILE, JSON.stringify(data, null, 2));
      return { ok: true, method: "direct" };
    }
    return { ok: false, error: "Run not found" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function directPurgeEnded() {
  try {
    const data = JSON.parse(fs.readFileSync(RUNS_FILE, "utf-8"));
    const runs = data.runs || {};
    let count = 0;
    for (const [id, run] of Object.entries(runs)) {
      if (run.endedAt) { delete runs[id]; count++; }
    }
    fs.writeFileSync(RUNS_FILE, JSON.stringify(data, null, 2));
    return { ok: true, deleted: count, method: "direct" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── File activity scanner ───

function scanRecentFiles(dir, maxDepth = 4, cutoffMs = 600000) {
  const now = Date.now();
  const results = [];
  const SKIP = new Set(["node_modules", ".git", ".cache", "user-data", "__pycache__", "memory"]);

  function walk(d, depth) {
    if (depth > maxDepth) return;
    try {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        if (SKIP.has(ent.name)) continue;
        const full = path.join(d, ent.name);
        try {
          if (ent.isDirectory()) {
            walk(full, depth + 1);
          } else {
            const stat = fs.statSync(full);
            if (now - stat.mtimeMs < cutoffMs) {
              results.push({
                path: path.relative(WORKSPACE, full).replace(/\\/g, "/"),
                size: stat.size,
                modified: stat.mtimeMs,
              });
            }
          }
        } catch {}
      }
    } catch {}
  }

  walk(dir, 0);
  results.sort((a, b) => b.modified - a.modified);
  return results.slice(0, 50);
}

// ─── Gateway log parsing ───

function getTodayLogFile() {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return path.join(LOG_DIR, `openclaw-${ymd}.log`);
}

function stripAnsi(str) {
  return str.replace(/\u001b\[[0-9;]*m/g, "");
}

function parseLogLine(line) {
  try {
    const obj = JSON.parse(line);
    const subsystem = obj["0"];
    const message = obj["1"] || obj["0"] || "";
    const level = obj._meta?.logLevelName || "INFO";
    const time = obj.time || obj._meta?.date || "";
    const cleanMsg = stripAnsi(typeof message === "string" ? message : JSON.stringify(message));
    const cleanSub = stripAnsi(typeof subsystem === "string" ? subsystem : "");

    const agentCtx = cleanMsg.match(/Agent context updated:\s*(\w+)/);
    if (agentCtx) return { type: "agent_active", agent: agentCtx[1], time, level };

    const wsMatch = cleanMsg.match(/(sessions?\.\w+|agent\.?\w*)\s+(\d+)ms/);
    if (wsMatch) return { type: "ws_op", operation: wsMatch[1], durationMs: parseInt(wsMatch[2]), time, level };

    if (/TASK_RESULT|ARCHITECTURE_RESULT|REVIEW_RESULT/.test(cleanMsg)) {
      return { type: "task_result", message: cleanMsg.slice(0, 500), time, level };
    }

    let parsedSub;
    try { parsedSub = JSON.parse(cleanSub); } catch { parsedSub = null; }
    if (!parsedSub?.subsystem && cleanMsg.length > 3 && level === "INFO") {
      return { type: "agent_message", message: cleanMsg.slice(0, 500), time, level };
    }

    if (level === "ERROR" || level === "FATAL") {
      return { type: "error", message: cleanMsg.slice(0, 500), subsystem: cleanSub, time, level };
    }

    if (level === "WARN" && cleanMsg.includes("lane wait exceeded")) {
      return { type: "warning", message: cleanMsg.slice(0, 300), time, level };
    }

    return null;
  } catch { return null; }
}

// Tail log
let lastLogSize = 0;
let recentEvents = [];
const MAX_EVENTS = 200;

function tailLog() {
  const logFile = getTodayLogFile();
  if (!fs.existsSync(logFile)) return;
  const stat = fs.statSync(logFile);
  if (stat.size <= lastLogSize) return;

  const stream = fs.createReadStream(logFile, { start: lastLogSize, encoding: "utf-8" });
  let buffer = "";
  stream.on("data", (chunk) => { buffer += chunk; });
  stream.on("end", () => {
    lastLogSize = stat.size;
    for (const line of buffer.split("\n")) {
      if (!line.trim()) continue;
      const evt = parseLogLine(line);
      if (evt) {
        recentEvents.push(evt);
        if (recentEvents.length > MAX_EVENTS) recentEvents.shift();
        broadcast("log", evt);
      }
    }
  });
}

// Watch runs.json
let lastRunsJson = "";
function watchRuns() {
  try {
    if (!fs.existsSync(RUNS_FILE)) return;
    const raw = fs.readFileSync(RUNS_FILE, "utf-8");
    if (raw === lastRunsJson) return;
    lastRunsJson = raw;
    const runs = parseRuns();
    const states = getAgentStates(runs);
    broadcast("runs", { runs: runs.slice(0, 50), agents: states, graph: buildAgentGraph(runs) });
  } catch {}
}

// ─── HTTP helpers ───

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => body += c);
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ─── HTTP Server ───

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // ── Static ──
  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    const p = path.join(__dirname, "dashboard.html");
    if (fs.existsSync(p)) fs.createReadStream(p).pipe(res);
    else res.end("<h1>dashboard.html not found</h1>");
    return;
  }

  // ── Read APIs ──
  if (url.pathname === "/api/state") {
    const runs = parseRuns();
    const agents = getAgentStates(runs);
    // Build tree relationships from runs
    const tree = [];
    for (const run of runs) {
      tree.push({
        id: run.id,
        sessionKey: run.sessionKey,
        agent: run.agent,
        parent: run.parent,
        parentSessionKey: run.parentSessionKey,
        status: run.endedAt ? (run.error ? "error" : "completed") : "running",
        task: run.task,
        createdAt: run.createdAt,
        durationMs: run.durationMs,
      });
    }
    const graph = buildAgentGraph(runs);
    return json(res, 200, { agents, runs: runs.slice(0, 100), events: recentEvents.slice(-100), meta: AGENT_META, gatewayConnected, tree: tree.slice(0, 50), graph });
  }

  if (url.pathname === "/api/run" && url.searchParams.get("id")) {
    const all = loadRuns();
    const run = all[url.searchParams.get("id")];
    return json(res, run ? 200 : 404, run || { error: "not found" });
  }

  if (url.pathname === "/api/tokens") {
    const sessionKey = url.searchParams.get("session");
    const startedAt = parseInt(url.searchParams.get("startedAt") || "0");
    const model = url.searchParams.get("model") || null;
    if (!sessionKey) return json(res, 400, { error: "session param required" });
    try {
      const usage = getTokenUsage(sessionKey, startedAt, model);
      return json(res, 200, usage || { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, costUsd: undefined });
    } catch (err) { return json(res, 500, { error: err.message }); }
  }

  if (url.pathname === "/api/run-tokens") {
    // Get token usage for all recent runs (batch)
    const runs = parseRuns().slice(0, 50);
    const result = {};
    for (const run of runs) {
      if (!run.sessionKey || !run.startedAt) continue;
      try {
        const usage = getTokenUsage(run.sessionKey, run.startedAt, run.model || null);
        if (usage) result[run.id] = usage;
      } catch {}
    }
    return json(res, 200, result);
  }

  if (url.pathname === "/api/files") {
    const mins = parseInt(url.searchParams.get("minutes") || "10");
    return json(res, 200, { files: scanRecentFiles(WORKSPACE, 4, mins * 60000) });
  }

  if (url.pathname === "/api/gateway") {
    return json(res, 200, { connected: gatewayConnected });
  }

  if (url.pathname === "/api/analytics") {
    const runs = parseRuns();
    const raw = loadRuns();
    const byAgent = {};
    const byModel = {};
    const timeline = {};
    let totalDuration = 0;
    let completedCount = 0;
    let errorCount = 0;

    for (const run of runs) {
      // Per-agent
      const aid = run.agent || "unknown";
      if (!byAgent[aid]) byAgent[aid] = { runs: 0, errors: 0, totalMs: 0, completed: 0 };
      byAgent[aid].runs++;
      if (run.error) { byAgent[aid].errors++; errorCount++; }
      if (run.endedAt) {
        byAgent[aid].completed++;
        byAgent[aid].totalMs += run.durationMs || 0;
        completedCount++;
        totalDuration += run.durationMs || 0;
      }

      // Per-model (from run data in runs.json)
      const fullRun = raw[run.id] || {};
      const model = fullRun.model || "default";
      if (!byModel[model]) byModel[model] = { runs: 0, errors: 0, totalMs: 0 };
      byModel[model].runs++;
      if (run.error) byModel[model].errors++;
      byModel[model].totalMs += run.durationMs || 0;

      // Timeline (group by hour)
      if (run.createdAt) {
        const d = new Date(run.createdAt);
        const hourKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:00`;
        if (!timeline[hourKey]) timeline[hourKey] = { runs: 0, errors: 0 };
        timeline[hourKey].runs++;
        if (run.error) timeline[hourKey].errors++;
      }
    }

    // Estimated tokens (rough: ~50 tokens/sec of LLM inference)
    const estTokens = Math.round(totalDuration / 1000 * 50);

    return json(res, 200, {
      total: runs.length,
      completed: completedCount,
      errors: errorCount,
      active: runs.filter(r => !r.endedAt).length,
      totalDurationMs: totalDuration,
      avgDurationMs: completedCount > 0 ? Math.round(totalDuration / completedCount) : 0,
      estimatedTokens: estTokens,
      byAgent,
      byModel,
      timeline: Object.entries(timeline).sort((a,b) => a[0].localeCompare(b[0])).map(([k,v]) => ({ hour: k, ...v })),
      meta: AGENT_META,
    });
  }

  // ── SSE ──
  if (url.pathname === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
    res.write("event: connected\ndata: {}\n\n");
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  // ── Action APIs (POST) ──
  if (req.method === "POST" && url.pathname === "/api/abort") {
    const { sessionKey } = await readBody(req);
    if (!sessionKey) return json(res, 400, { error: "sessionKey required" });
    try {
      const result = await gwRequest("sessions.abort", { key: sessionKey });
      return json(res, 200, { ok: true, result });
    } catch (err) {
      return json(res, 502, { error: err.message || "Gateway error", hint: "Gateway not connected — abort requires a live gateway" });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/delete") {
    const { sessionKey } = await readBody(req);
    if (!sessionKey) return json(res, 400, { error: "sessionKey required" });
    try {
      const result = await gwRequest("sessions.delete", { key: sessionKey });
      return json(res, 200, { ok: true, result });
    } catch (err) {
      // Fallback: remove from runs.json directly
      const fallback = directDeleteRun(sessionKey);
      if (fallback.ok) return json(res, 200, { ok: true, method: "direct", note: "Removed from runs.json (gateway offline)" });
      return json(res, 502, { error: err.message || "Gateway error", fallbackError: fallback.error });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/purge") {
    if (!gatewayConnected) {
      const result = directPurgeEnded();
      return json(res, 200, { total: result.deleted || 0, deleted: result.deleted || 0, errors: result.ok ? [] : [result.error], method: "direct" });
    }
    // Use gateway's sessions.list to get correct keys for dead sessions
    try {
      const listResult = await gwRequest("sessions.list", {});
      const sessions = listResult?.sessions || [];
      const dead = sessions.filter(s => s.endedAt && s.key !== "agent:main:main");
      const out = { total: dead.length, deleted: 0, errors: [] };
      // Delete in parallel batches of 10
      for (let i = 0; i < dead.length; i += 10) {
        const batch = dead.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map(s => gwRequest("sessions.delete", { key: s.key }))
        );
        for (let j = 0; j < results.length; j++) {
          if (results[j].status === "fulfilled") out.deleted++;
          else out.errors.push({ key: batch[j].key, error: results[j].reason?.message || String(results[j].reason) });
        }
      }
      // Also clean runs.json
      directPurgeEnded();
      return json(res, 200, out);
    } catch (err) {
      // Fallback
      const result = directPurgeEnded();
      return json(res, 200, { total: result.deleted || 0, deleted: result.deleted || 0, errors: result.ok ? [] : [err.message], method: "direct" });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/stop-all") {
    if (!gatewayConnected) {
      return json(res, 502, { error: "Gateway not connected — abort requires a live gateway" });
    }
    try {
      const listResult = await gwRequest("sessions.list", {});
      const sessions = listResult?.sessions || [];
      const active = sessions.filter(s => !s.endedAt && s.key !== "agent:main:main");
      const out = { total: active.length, aborted: 0, errors: [] };
      for (const s of active) {
        try {
          await gwRequest("sessions.abort", { key: s.key });
          out.aborted++;
        } catch (err) {
          out.errors.push({ key: s.key, error: err.message || String(err) });
        }
      }
      return json(res, 200, out);
    } catch (err) {
      return json(res, 502, { error: err.message || "Gateway error" });
    }
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n  \u{1F99E} OpenClaw Live Dashboard v2`);
  console.log(`  -- http://localhost:${PORT}\n`);
  console.log(`  Watching:`);
  console.log(`    Runs:  ${RUNS_FILE}`);
  console.log(`    Logs:  ${getTodayLogFile()}`);
  console.log(`    Files: ${WORKSPACE}`);
  console.log(`    Agents: ${Object.keys(AGENT_META).join(", ")}`);
  console.log(`    Gateway: ws://${GATEWAY_HOST}:${GATEWAY_PORT} (token: ${GATEWAY_TOKEN ? "yes" : "NO"})\n`);
  connectGateway();
});

setInterval(tailLog, 2000);
setInterval(watchRuns, 3000);
tailLog();
watchRuns();
