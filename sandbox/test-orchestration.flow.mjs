import { defineFlow, acp, compute } from "acpx/flows";

export default defineFlow({
  name: "orchestration-test",
  run: { title: "Test orchestration — architect, coder, reviewer" },
  startAt: "architect",
  nodes: {
    architect: acp({
      profile: "architect",
      prompt: () =>
        "Test task: Design the API contract for a GET /health endpoint for a Node.js service. " +
        "Return your answer as JSON: { result, status, confidence, files_changed, notes, recommendation }. " +
        "Keep it concise — this is an orchestration test.",
      parse: (text) => {
        try { return JSON.parse(text); }
        catch { return { raw: text }; }
      },
    }),

    coder: acp({
      profile: "coder",
      prompt: (ctx) =>
        "Test task: Write a slugify(str) utility function in JavaScript. " +
        "The architect designed this API contract: " + JSON.stringify(ctx.outputs.architect) + ". " +
        "Return your answer as JSON: { result, status, confidence, files_changed, notes, recommendation }. " +
        "Do NOT write files. Keep it concise — this is an orchestration test.",
      parse: (text) => {
        try { return JSON.parse(text); }
        catch { return { raw: text }; }
      },
    }),

    reviewer: acp({
      profile: "reviewer",
      prompt: (ctx) =>
        "Test task: Review this code for issues:\n\n" +
        "function getUser(id) {\n" +
        "  const query = 'SELECT * FROM users WHERE id = ' + id;\n" +
        "  return db.execute(query);\n" +
        "}\n\n" +
        "Also review the coder's output: " + JSON.stringify(ctx.outputs.coder) + ". " +
        "Return your answer as JSON: { result, status, confidence, files_changed, notes, recommendation }. " +
        "Keep it concise — this is an orchestration test.",
      parse: (text) => {
        try { return JSON.parse(text); }
        catch { return { raw: text }; }
      },
    }),

    summary: compute({
      run: (ctx) => ({
        architect: ctx.results.architect,
        coder: ctx.results.coder,
        reviewer: ctx.results.reviewer,
        allPassed:
          ctx.results.architect?.outcome === "ok" &&
          ctx.results.coder?.outcome === "ok" &&
          ctx.results.reviewer?.outcome === "ok",
      }),
    }),
  },
  edges: [
    { from: "architect", to: "coder" },
    { from: "coder", to: "reviewer" },
    { from: "reviewer", to: "summary" },
  ],
});
