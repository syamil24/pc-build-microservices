import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
const confirmed = process.argv[3] === "confirmed";
const root = process.env.APEX_ROOT;

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const split = trimmed.indexOf("=");
    const key = trimmed.slice(0, split);
    if (!process.env[key]) process.env[key] = trimmed.slice(split + 1);
  }
}
if (root) loadEnv(path.join(root, ".env"));
const heal = process.env.APEX_HEAL_DIR || path.join(process.env.HOME || "", ".apex-heal");
const payload = JSON.parse(fs.readFileSync(file, "utf8"));
const actions = payload.actions || payload;
const protectedServices = new Set(["postgres", "kafka", "keycloak", "redis"]);
const mutating = /CONFIG SET|FLUSH|RESET|docker rm|docker run|docker restart|docker stop|\brm\b|\bmvn\b/i;

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv }
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || command).slice(0, 500));
  }
  return result.stdout || "";
}

function compose(args, extraEnv = {}) {
  const heaps = path.join(heal, "heaps.env");
  if (fs.existsSync(heaps)) {
    for (const line of fs.readFileSync(heaps, "utf8").split("\n")) {
      const split = line.indexOf("=");
      if (split > 0) extraEnv[line.slice(0, split)] = line.slice(split + 1);
    }
  }
  return run("docker", ["compose", "--project-directory", path.join(root, "deploy"), "-f", path.join(root, "deploy", "docker-compose.yml"), ...args], extraEnv);
}

function skillText() {
  const dir = path.join(heal, "imported");
  if (!fs.existsSync(dir)) return "";
  return fs.readdirSync(dir).filter((name) => name.endsWith(".md")).map((name) => fs.readFileSync(path.join(dir, name), "utf8")).join("\n");
}

function heapVar(service) {
  return `${service.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_JAVA_OPTS`;
}

const notes = [];
for (const action of actions) {
  if (action.op === "restart") {
    compose(["restart", action.service]);
    notes.push(`restarted ${action.service}`);
  } else if (action.op === "stop") {
    if (protectedServices.has(action.service) && !action.allowInfra) {
      throw new Error(`Refusing to stop ${action.service} unless the reply names it.`);
    }
    compose(["stop", action.service]);
    notes.push(`stopped ${action.service}`);
  } else if (action.op === "heap") {
    const mb = Math.min(512, Math.max(64, Number(action.mb) || 160));
    const key = heapVar(action.service);
    const value = `-Xms48m -Xmx${mb}m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:MaxMetaspaceSize=96m -Xss256k`;
    fs.mkdirSync(heal, { recursive: true });
    const heaps = path.join(heal, "heaps.env");
    const current = fs.existsSync(heaps) ? fs.readFileSync(heaps, "utf8").split("\n").filter((line) => line && !line.startsWith(`${key}=`)) : [];
    current.push(`${key}=${value}`);
    fs.writeFileSync(heaps, `${current.join("\n")}\n`);
    compose(["up", "-d", "--no-deps", "--force-recreate", action.service], { [key]: value });
    notes.push(`set ${action.service} heap to ${mb} MB`);
  } else if (action.op === "logs") {
    notes.push(compose(["logs", "--tail", "40", action.service]).slice(-1500));
  } else if (action.op === "smoke") {
    run("bash", [path.join(root, "scripts", "smoke-test.sh")]);
    notes.push("smoke test passed");
  } else if (action.op === "rollback") {
    run("git", ["checkout", "HEAD~1"]);
    run("bash", [path.join(root, "scripts", "vps", "deploy.sh")]);
    notes.push("rolled back one commit and deployed");
  } else if (action.op === "skill-command" || action.op === "apply-skill") {
    const command = action.command || "";
    const text = skillText();
    if (!command || !text.includes(command)) {
      throw new Error("That command is not in a pinned skill file.");
    }
    if (mutating.test(command) && !confirmed) {
      throw new Error("That skill command changes state. Reply that you want it applied.");
    }
    run("bash", ["-lc", command]);
    notes.push(`ran skill command: ${command}`);
  } else if (action.op === "edit-java") {
    if (!process.env.CURSOR_API_KEY) {
      throw new Error("CURSOR_API_KEY is required to edit Java.");
    }
    const { Agent } = await import("@cursor/sdk");
    const result = await Agent.prompt(
      `Edit only Java under services/, apex-common/, or apex-web/. Do not touch .env. ${action.instruction}`,
      {
        apiKey: process.env.CURSOR_API_KEY,
        model: { id: "composer-2.5", params: [{ id: "fast", value: "false" }] },
        local: { cwd: root }
      }
    );
    if (result.status === "error") throw new Error("Java edit failed");
    run("mvn", ["-B", "-DskipTests", "package"]);
    compose(["up", "-d", "--build"]);
    notes.push("edited Java, packaged, and recreated the containers");
  } else {
    throw new Error(`Unknown action ${action.op}`);
  }
}

process.stdout.write(notes.join("\n"));
