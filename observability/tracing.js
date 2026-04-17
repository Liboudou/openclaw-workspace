/**
 * OpenClaw Agent Tracing — OpenTelemetry Bootstrap
 * 
 * This file is loaded via NODE_OPTIONS=--require BEFORE the gateway starts.
 * It configures OpenTelemetry to export traces to Jaeger via OTLP/HTTP.
 * 
 * Usage: Set NODE_OPTIONS=--require ./observability/tracing.js
 * Or require() it at the top of your entry point.
 */

const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const JAEGER_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "openclaw-gateway",
    [ATTR_SERVICE_VERSION]: process.env.OPENCLAW_SERVICE_VERSION || "unknown",
    "deployment.environment": "local",
  }),
  traceExporter: new OTLPTraceExporter({
    url: JAEGER_ENDPOINT,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Auto-instrument HTTP calls (agent-to-agent, LLM API calls)
      "@opentelemetry/instrumentation-http": { enabled: true },
      // Auto-instrument fetch calls
      "@opentelemetry/instrumentation-fetch": { enabled: true },
      // Disable noisy filesystem instrumentation
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => console.log("[tracing] SDK shut down"))
    .catch((err) => console.error("[tracing] Shutdown error:", err))
    .finally(() => process.exit(0));
});

process.on("SIGINT", () => {
  sdk.shutdown()
    .then(() => console.log("[tracing] SDK shut down"))
    .catch((err) => console.error("[tracing] Shutdown error:", err))
    .finally(() => process.exit(0));
});

console.log(`[tracing] OpenTelemetry initialized → ${JAEGER_ENDPOINT}`);
