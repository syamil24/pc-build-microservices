import https from "https";

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const allowed = process.env.TELEGRAM_CHAT_ID || "";
const offset = process.argv[2] || "0";

function write(next, messages) {
  process.stdout.write(String(next) + "\n" + JSON.stringify(messages) + "\n");
}

function get(url) {
  return new Promise(function (resolve, reject) {
    const req = https.get(url, function (res) {
      const chunks = [];
      res.on("data", function (chunk) { chunks.push(chunk); });
      res.on("end", function () {
        resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, function () {
      req.destroy();
      reject(new Error("Telegram request timed out"));
    });
  });
}

async function main() {
  if (!token || !allowed) {
    write(offset, []);
    return;
  }
  const response = await get("https://api.telegram.org/bot" + token + "/getUpdates?timeout=0&offset=" + encodeURIComponent(offset));
  if (response.status !== 200) {
    throw new Error("Telegram getUpdates failed (" + response.status + ")");
  }
  const body = JSON.parse(response.body || "{}");
  let next = Number(offset);
  const messages = [];
  const updates = body.result || [];
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    next = update.update_id + 1;
    const message = update.message;
    if (!message || String(message.chat.id) !== String(allowed)) continue;
    messages.push({ updateId: update.update_id, text: message.text || "" });
  }
  write(next, messages);
}

main().catch(function (err) {
  process.stderr.write(String((err && err.message) || err) + "\n");
  process.exit(1);
});
