const token = process.env.TELEGRAM_BOT_TOKEN || "";
const allowed = process.env.TELEGRAM_CHAT_ID || "";
const offset = process.argv[2] || "0";
if (!token || !allowed) {
  process.stdout.write(`${offset}\n`);
  process.exit(0);
}
const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?timeout=0&offset=${offset}`);
const body = await response.json();
let next = Number(offset);
const messages = [];
for (const update of body.result || []) {
  next = update.update_id + 1;
  const message = update.message;
  if (!message || String(message.chat.id) !== String(allowed)) continue;
  messages.push({ updateId: update.update_id, text: message.text || "" });
}
process.stdout.write(`${next}\n${JSON.stringify(messages)}\n`);
