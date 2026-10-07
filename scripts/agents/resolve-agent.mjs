if (!process.env.CURSOR_API_KEY) {
  console.error("CURSOR_API_KEY is not set");
  process.exit(1);
}
const note = process.env.RESOLVE_NOTE || "The pull request checks failed.";
const { Agent } = await import("@cursor/sdk");
const result = await Agent.prompt(
  `Fix the pull request on this checkout. Do not merge. Do not edit .env. ${note}`,
  {
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: "composer-2.5", params: [{ id: "fast", value: "false" }] },
    local: { cwd: process.cwd() }
  }
);
if (result.status === "error") process.exit(2);
process.stdout.write(String(result.result || ""));
