import fs from "node:fs";

const diff = fs.readFileSync(process.argv[2], "utf8").slice(0, 20000);
if (!process.env.CURSOR_API_KEY) {
  process.exit(0);
}
const { Agent } = await import("@cursor/sdk");
const result = await Agent.prompt(
  `Review this Apex Build pull request diff. Comment on bounded contexts, integer cents, secrets, and Flyway. Return plain text under 1200 characters.\n\n${diff}`,
  {
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: "composer-2.5", params: [{ id: "fast", value: "false" }] },
    cloud: {
      repos: [{ url: "https://github.com/syamil24/pc-build-microservices", startingRef: process.env.PR_HEAD_SHA || "master" }]
    }
  }
);
if (result.status !== "error" && result.result) {
  process.stdout.write(String(result.result).slice(0, 1200));
}
