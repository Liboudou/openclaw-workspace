/**
 * OpenClaw Tracing — Smoke test
 * 
 * Run this to verify traces reach Jaeger:
 *   node observability/test-trace.js
 * 
 * Then open http://localhost:16686, search for service "openclaw-gateway"
 */

const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

const exporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: "openclaw-gateway" }),
  traceExporter: exporter,
});
sdk.start();

const { AgentTracer } = require("./agent-tracer");
const tracer = new AgentTracer();

async function simulateAgentRun() {
  console.log("[test] Simulating main-agent → 3 sub-agents...\n");

  await tracer.traceAgent("main", { input: "Build a hello-world app" }, async () => {
    console.log("  [main] Dispatching to architect...");
    await tracer.traceSubAgent("architect", { task: "Design system architecture" }, async () => {
      await sleep(200);
      return { design: "microservices with REST API" };
    });

    console.log("  [main] Dispatching to coder...");
    await tracer.traceSubAgent("coder", { task: "Implement hello-world endpoint" }, async () => {
      await tracer.traceLLMCall("gpt-4.1", { prompt: "Write a hello world API" }, async () => {
        await sleep(300);
        return { response: "const app = express()...", usage: { input: 50, output: 120 } };
      });

      await tracer.traceToolCall("file_write", { input: { path: "hello.js" } }, async () => {
        await sleep(100);
        return { success: true };
      });

      return { code: "hello.js created" };
    });

    console.log("  [main] Dispatching to reviewer...");
    await tracer.traceSubAgent("reviewer", { task: "Review hello.js" }, async () => {
      await sleep(150);
      return { status: "APPROVED", comments: [] };
    });

    return { status: "complete", files: ["hello.js"] };
  });

  console.log("\n[test] Flushing traces to Jaeger...");
  await sdk.shutdown();

  console.log("[test] Check Jaeger at http://localhost:16686");
  console.log('  → Search for service: "openclaw-gateway"');
  console.log("  → You should see a trace with 6 spans:");
  console.log("     agent:main");
  console.log("       ├── sub-agent:architect");
  console.log("       ├── sub-agent:coder");
  console.log("       │     ├── llm:gpt-4.1");
  console.log("       │     └── tool:file_write");
  console.log("       └── sub-agent:reviewer");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

simulateAgentRun().catch((err) => {
  console.error("[test] Error:", err);
  process.exit(1);
});
