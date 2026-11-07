import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const question = process.argv[2] || "";
const root = process.env.APEX_ROOT || process.cwd();
const ports = [8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8761];

function readCpuSample() {
  const line = fs.readFileSync("/proc/stat", "utf8").split("\n")[0];
  const parts = line.trim().split(/\s+/).slice(1).map(Number);
  const total = parts.reduce((sum, value) => sum + value, 0);
  const idle = (parts[3] || 0) + (parts[4] || 0);
  return { total, idle };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cpuPercent() {
  try {
    const first = readCpuSample();
    await sleep(300);
    const second = readCpuSample();
    const total = second.total - first.total;
    const idle = second.idle - first.idle;
    if (total <= 0) return "unavailable";
    return Math.round(((total - idle) / total) * 100);
  } catch {
    return "unavailable";
  }
}

function memory() {
  try {
    const text = fs.readFileSync("/proc/meminfo", "utf8");
    const pick = (name) => {
      const match = text.match(new RegExp(`${name}:\\s+(\\d+)`));
      return match ? Number(match[1]) : 0;
    };
    const total = pick("MemTotal");
    const available = pick("MemAvailable");
    const used = Math.max(total - available, 0);
    return {
      totalMb: Math.round(total / 1024),
      usedMb: Math.round(used / 1024),
      availableMb: Math.round(available / 1024),
      usedPercent: total ? Math.round((used / total) * 100) : 0
    };
  } catch {
    return null;
  }
}

function get(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ status: 0, body: "" });
    });
  });
}

async function requests() {
  const response = await get("http://127.0.0.1:8080/actuator/metrics/http.server.requests");
  if (response.status !== 200) return "unavailable";
  try {
    const body = JSON.parse(response.body);
    const count = (body.measurements || []).find((item) => item.statistic === "COUNT");
    return count ? Math.round(count.value) : "unavailable";
  } catch {
    return "unavailable";
  }
}

async function healthLines() {
  const lines = [];
  for (const port of ports) {
    const response = await get(`http://127.0.0.1:${port}/actuator/health`);
    lines.push(`${port} ${response.status === 200 ? "up" : "down"}`);
  }
  return lines.join(", ");
}

function recentErrors() {
  const dir = path.join(root, "logs");
  if (!fs.existsSync(dir)) return "No recent log errors.";
  const now = Date.now();
  const hits = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".log") && !name.endsWith(".err.log")) continue;
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (now - stat.mtimeMs > 60000) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n").filter((line) => /ERROR|Exception|OutOfMemoryError/.test(line));
    const last = lines[lines.length - 1];
    if (last) hits.push(`${name}: ${last.slice(0, 180)}`);
  }
  return hits.length ? hits.slice(0, 3).join(" | ") : "No recent log errors.";
}

function summary(facts) {
  const memoryText = facts.memory
    ? `Memory ${facts.memory.usedMb} MB of ${facts.memory.totalMb} MB, ${facts.memory.usedPercent}% used.`
    : "Memory is unavailable.";
  return [
    `CPU ${facts.cpuPercent}%.`,
    memoryText,
    `Gateway requests since start: ${facts.requests}.`,
    `Services: ${facts.health}.`,
    facts.errors
  ].join(" ");
}

function keyword(text, facts) {
  const lower = text.toLowerCase();
  const wantsCpu = /\b(cpu|processor)\b/.test(lower);
  const wantsMemory = /\b(mem|ram|memory)\b/.test(lower);
  const wantsRequests = /\b(request|traffic|calls)\b/.test(lower);
  if ([wantsCpu, wantsMemory, wantsRequests].filter(Boolean).length > 1) return summary(facts);
  if (wantsCpu) return `CPU is ${facts.cpuPercent}% right now.`;
  if (wantsMemory) {
    if (!facts.memory) return "Memory is unavailable on this host.";
    return `Memory in use is ${facts.memory.usedMb} MB of ${facts.memory.totalMb} MB (${facts.memory.usedPercent}%). ${facts.memory.availableMb} MB is available.`;
  }
  if (wantsRequests) return `The gateway has served ${facts.requests} requests since it started.`;
  if (/\b(health|status|error|log)\b/.test(lower)) return summary(facts);
  if (/\b(hello|hi|hey)\b/.test(lower)) return "I'm watching the shop. Ask for CPU, memory, request count, or service health. I'll message you when a log or a health check fails.";
  return null;
}

async function fromModel(text, facts) {
  if (!process.env.CURSOR_API_KEY) return null;
  const { Agent } = await import("@cursor/sdk");
  const result = await Agent.prompt(
    [
      "You are the Apex Build operator on Telegram.",
      "Answer the question in plain sentences using only the facts below.",
      "Do not invent numbers. Do not suggest shell commands.",
      `Facts: ${JSON.stringify(facts)}`,
      `Question: ${text}`
    ].join("\n"),
    {
      apiKey: process.env.CURSOR_API_KEY,
      model: { id: "composer-2.5", params: [{ id: "fast", value: "false" }] },
      local: { cwd: root }
    }
  );
  if (result.status === "error" || !result.result) return null;
  return String(result.result).slice(0, 1200);
}

const facts = {
  cpuPercent: await cpuPercent(),
  memory: memory(),
  requests: await requests(),
  health: await healthLines(),
  errors: recentErrors()
};
let reply = keyword(question, facts);
if (!reply) {
  try {
    reply = await fromModel(question, facts);
  } catch {
    reply = null;
  }
}
process.stdout.write(reply || summary(facts));
