/**
 * OpenClaw Agent Tracer — Custom span instrumentation for agents
 * 
 * Provides helper functions to create meaningful traces for:
 * - Main agent (orchestrator) execution
 * - Sub-agent dispatch (sessions_spawn)
 * - LLM calls
 * - Tool invocations
 * 
 * Usage:
 *   const { AgentTracer } = require("./agent-tracer");
 *   const tracer = new AgentTracer();
 *   
 *   // Wrap an agent execution:
 *   await tracer.traceAgent("main", { input: "user query" }, async (span) => {
 *     // ... agent logic ...
 *     await tracer.traceSubAgent("coder", { task: "fix bug" }, async (childSpan) => {
 *       // ... sub-agent logic ...
 *     });
 *   });
 */

const { trace, SpanStatusCode, context, propagation } = require("@opentelemetry/api");

const TRACER_NAME = "openclaw-agents";

class AgentTracer {
  constructor() {
    this.tracer = trace.getTracer(TRACER_NAME);
  }

  /**
   * Trace a main agent execution (root span).
   */
  async traceAgent(agentId, attributes = {}, fn) {
    return this.tracer.startActiveSpan(`agent:${agentId}`, async (span) => {
      try {
        span.setAttribute("agent.id", agentId);
        span.setAttribute("agent.type", "main");
        span.setAttribute("openclaw.version", process.env.OPENCLAW_SERVICE_VERSION || "unknown");

        if (attributes.input) {
          span.setAttribute("agent.input", _truncate(JSON.stringify(attributes.input), 4096));
        }
        for (const [key, val] of Object.entries(attributes)) {
          if (key !== "input") {
            span.setAttribute(`agent.${key}`, typeof val === "string" ? val : JSON.stringify(val));
          }
        }

        const result = await fn(span);

        if (result !== undefined) {
          span.setAttribute("agent.output", _truncate(JSON.stringify(result), 4096));
        }
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Trace a sub-agent dispatch (child span of current context).
   */
  async traceSubAgent(agentId, attributes = {}, fn) {
    return this.tracer.startActiveSpan(`sub-agent:${agentId}`, async (span) => {
      try {
        span.setAttribute("agent.id", agentId);
        span.setAttribute("agent.type", "sub");
        span.setAttribute("agent.name", agentId);

        if (attributes.task) {
          span.setAttribute("agent.task", _truncate(attributes.task, 4096));
        }
        if (attributes.input) {
          span.setAttribute("agent.input", _truncate(JSON.stringify(attributes.input), 4096));
        }
        for (const [key, val] of Object.entries(attributes)) {
          if (key !== "input" && key !== "task") {
            span.setAttribute(`agent.${key}`, typeof val === "string" ? val : JSON.stringify(val));
          }
        }

        const result = await fn(span);

        if (result !== undefined) {
          span.setAttribute("agent.output", _truncate(JSON.stringify(result), 4096));
        }
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Trace an LLM call.
   */
  async traceLLMCall(model, attributes = {}, fn) {
    return this.tracer.startActiveSpan(`llm:${model}`, async (span) => {
      try {
        span.setAttribute("llm.model", model);
        if (attributes.prompt) {
          span.setAttribute("llm.prompt", _truncate(attributes.prompt, 2048));
        }
        if (attributes.tokens) {
          span.setAttribute("llm.tokens", attributes.tokens);
        }
        if (attributes.temperature !== undefined) {
          span.setAttribute("llm.temperature", attributes.temperature);
        }

        const result = await fn(span);

        if (result) {
          if (typeof result === "string") {
            span.setAttribute("llm.response", _truncate(result, 2048));
          } else if (result.response) {
            span.setAttribute("llm.response", _truncate(result.response, 2048));
          }
          if (result.usage) {
            span.setAttribute("llm.tokens.input", result.usage.input || 0);
            span.setAttribute("llm.tokens.output", result.usage.output || 0);
          }
        }
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Trace a tool call.
   */
  async traceToolCall(toolName, attributes = {}, fn) {
    return this.tracer.startActiveSpan(`tool:${toolName}`, async (span) => {
      try {
        span.setAttribute("tool.name", toolName);
        if (attributes.input) {
          span.setAttribute("tool.input", _truncate(JSON.stringify(attributes.input), 4096));
        }

        const result = await fn(span);

        if (result !== undefined) {
          span.setAttribute("tool.output", _truncate(JSON.stringify(result), 4096));
        }
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Create a quick span for an event (non-async).
   */
  recordEvent(name, attributes = {}) {
    const span = this.tracer.startSpan(`event:${name}`);
    for (const [key, val] of Object.entries(attributes)) {
      span.setAttribute(key, typeof val === "string" ? val : JSON.stringify(val));
    }
    span.end();
  }

  /**
   * Get the raw OpenTelemetry tracer for advanced usage.
   */
  getTracer() {
    return this.tracer;
  }
}

/**
 * Truncate a string to maxLen to avoid overloading trace attributes.
 */
function _truncate(str, maxLen = 4096) {
  if (!str) return "";
  if (typeof str !== "string") str = String(str);
  return str.length > maxLen ? str.slice(0, maxLen) + "...[truncated]" : str;
}

module.exports = { AgentTracer };
