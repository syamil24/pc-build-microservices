// Cursor local edit used only by the emergency_fix tool.

import { Agent, CursorAgentError } from "@cursor/sdk";

const instruction = process.argv[2] || "";
const root = process.env.APEX_ROOT || process.cwd();
if (!process.env.CURSOR_API_KEY) {
  process.stderr.write("CURSOR_API_KEY is not set\n");
  process.exit(1);
}

try {
  const result = await Agent.prompt(
    `Edit only Java under services/, apex-common/, or apex-web/. Do not touch .env. ${instruction}`,
    {
      apiKey: process.env.CURSOR_API_KEY,
      model: { id: "composer-2.5", params: [{ id: "fast", value: "false" }] },
      local: { cwd: root }
    }
  );
  if (result.status === "error") {
    process.stderr.write(`${result.result || "edit failed"}\n`);
    process.exit(2);
  }
  process.stdout.write(String(result.result || "edited"));
} catch (err) {
  if (err instanceof CursorAgentError) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
  throw err;
}
