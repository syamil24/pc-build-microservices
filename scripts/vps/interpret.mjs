import fs from "node:fs";
import path from "node:path";

const incidentPath = process.argv[2];
const reply = process.argv[3] || "";
const heal = process.env.APEX_HEAL_DIR || path.join(process.env.HOME || "", ".apex-heal");
const incident = JSON.parse(fs.readFileSync(incidentPath, "utf8"));

const protectedServices = new Set(["postgres", "kafka", "keycloak", "redis"]);

function skills() {
  const file = path.join(heal, "skills.json");
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

function importedText() {
  const dir = path.join(heal, "imported");
  if (!fs.existsSync(dir)) return "";
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => fs.readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
}

function keyword(text) {
  const actions = [];
  const lower = text.toLowerCase();
  const restart = lower.match(/\brestart\s+([a-z0-9-]+)/);
  if (restart && restart[1] !== "it") actions.push({ op: "restart", service: restart[1] });
  const stop = lower.match(/\bstop\s+([a-z0-9-]+)/);
  if (stop) {
    const service = stop[1];
    actions.push({
      op: "stop",
      service,
      allowInfra: protectedServices.has(service) && text.includes(service)
    });
  }
  const heap = lower.match(/\b(\d{2,4})\s*mb\b/);
  const heapService = lower.match(/\b(payment-1|payment-2|payment-3|payment|order-service|auth-service|gateway-service|inventory-service|user-service|shipping-service|cache-service|report-service|discovery-service)\b/);
  if (heap && heapService) {
    const service = heapService[1] === "payment" ? "payment-1" : heapService[1];
    actions.push({ op: "heap", service, mb: Number(heap[1]) });
  }
  if (/\blogs\b/.test(lower)) {
    const service = (lower.match(/\blogs\s+([a-z0-9-]+)/) || [])[1] || incident.service || "gateway-service";
    actions.push({ op: "logs", service });
  }
  if (/\brollback\b/.test(lower)) actions.push({ op: "rollback" });
  if (/\bsmoke\b/.test(lower)) actions.push({ op: "smoke" });
  if (/\bfix\b/.test(lower) || /\bedit\b/.test(lower) || /\bnull pointer\b/.test(lower)) {
    actions.push({ op: "edit-java", instruction: text });
  }
  const apply = lower.match(/apply the ([a-z-]+) skill/);
  if (apply) actions.push({ op: "apply-skill", name: apply[1], reply: text });
  return actions.slice(0, 3);
}

function matchSkill() {
  const signal = `${incident.signal || ""} ${incident.service || ""}`.toLowerCase();
  return skills().find((skill) => skill.recovered && signal.includes(String(skill.signal || "").toLowerCase()));
}

function validate(actions) {
  const allowed = new Set(["restart", "stop", "heap", "logs", "rollback", "smoke", "edit-java", "apply-skill", "skill-command"]);
  return actions.filter((action) => action && allowed.has(action.op)).slice(0, 3);
}

async function fromModel(text) {
  if (!process.env.CURSOR_API_KEY || !text) return null;
  const { Agent } = await import("@cursor/sdk");
  const prompt = [
    "Return JSON only. No markdown.",
    "Shape: {\"actions\":[{\"op\":\"restart|stop|heap|logs|rollback|smoke|edit-java|skill-command\",\"service\":\"\",\"mb\":320,\"instruction\":\"\",\"command\":\"\"}]}",
    "At most 3 actions. skill-command.command must be copied from the skill text.",
    `Incident: ${JSON.stringify(incident)}`,
    `Known skills: ${JSON.stringify(skills())}`,
    `Skill text: ${importedText().slice(0, 12000)}`,
    `Reply: ${text}`
  ].join("\n");
  const result = await Agent.prompt(prompt, {
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: "composer-2.5", params: [{ id: "fast", value: "false" }] },
    local: { cwd: process.env.APEX_ROOT || process.cwd() }
  });
  if (result.status === "error") return null;
  const body = String(result.result || "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  const parsed = JSON.parse(body.slice(start, end + 1));
  return validate(parsed.actions || []);
}

const matched = reply ? null : matchSkill();
let actions = [];
if (matched) {
  actions = validate(matched.actions || []);
} else if (reply) {
  try {
    actions = (await fromModel(reply)) || keyword(reply);
  } catch {
    actions = keyword(reply);
  }
}

process.stdout.write(`${JSON.stringify({
  actions,
  matched: Boolean(matched),
  skill: matched || null
})}\n`);
