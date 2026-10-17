// Draws original vector art for the house-brand products in catalog-seed.json
// (Voltedge, Nighthawk, ApexCore, Lumina, Krait, Helix) plus the demo desk mat.
// These are our own fictional products, so the art is drawn here, not fetched.
const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "..", "..", "services", "inventory-service", "src", "main", "resources", "catalog-seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const demoPad = { sku: "PER-DEMO-PAD", name: "Apex Desk Mat", category: "PERIPHERAL", brand: "Apex", hue: 200, specs: { kind: "mousepad" } };
const items = [...seed, demoPad];

const outDir = path.join(__dirname, "out");
fs.mkdirSync(outDir, { recursive: true });

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sql(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function specLine(item) {
  const s = item.specs || {};
  const parts = [];
  if (s.socket) parts.push(s.socket);
  if (s.sockets) parts.push(s.sockets.join(" / "));
  if (s.tdpWatts) parts.push(s.tdpWatts + " W");
  if (s.ramType) parts.push(s.ramType);
  if (s.capacityGb) parts.push(s.capacityGb >= 1000 ? (s.capacityGb / 1000) + " TB" : s.capacityGb + " GB");
  if (s.formFactor) parts.push(s.formFactor);
  if (s.wattage) parts.push(s.wattage + " W");
  if (s.lengthMm) parts.push(s.lengthMm + " mm");
  if (s.maxGpuLengthMm) parts.push("GPU " + s.maxGpuLengthMm + " mm");
  if (s.storageType) parts.push(s.storageType);
  if (s.screen) parts.push(s.screen);
  if (s.sizeInches) parts.push(s.sizeInches + '"');
  if (s.resolution) parts.push(s.resolution);
  if (s.refreshHz) parts.push(s.refreshHz + " Hz");
  if (s.kind) parts.push(String(s.kind).toUpperCase());
  return parts.join("  ·  ");
}

const glyph = {
  CPU: () => `
    <rect x="330" y="120" width="540" height="540" rx="36" fill="#2a303c" stroke="#454e5e" stroke-width="6"/>
    <rect x="400" y="190" width="400" height="400" rx="18" fill="#141922" stroke="#d6ff3f" stroke-width="5"/>
    ${pins(330, 120)}
    <text x="600" y="420" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="120" font-weight="700">CPU</text>`,
  MOTHERBOARD: () => `
    <rect x="270" y="110" width="660" height="560" rx="22" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
    <rect x="330" y="170" width="220" height="220" rx="14" fill="#10141c" stroke="#d6ff3f" stroke-width="5"/>
    <rect x="610" y="170" width="34" height="300" rx="8" fill="#49e2ff" opacity="0.85"/>
    <rect x="664" y="170" width="34" height="300" rx="8" fill="#49e2ff" opacity="0.6"/>
    <rect x="718" y="170" width="34" height="300" rx="8" fill="#49e2ff" opacity="0.4"/>
    <rect x="330" y="450" width="420" height="40" rx="8" fill="#2c3442"/>
    <rect x="330" y="520" width="300" height="40" rx="8" fill="#2c3442"/>
    <circle cx="860" cy="600" r="26" fill="#d6ff3f"/>`,
  RAM: () => `
    <g transform="rotate(-8 600 400)">
      <rect x="300" y="200" width="150" height="420" rx="14" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
      <rect x="322" y="230" width="106" height="300" rx="8" fill="#10141c"/>
      <rect x="322" y="230" width="106" height="60" fill="#d6ff3f" opacity="0.9"/>
    </g>
    <g transform="rotate(8 600 400)">
      <rect x="750" y="200" width="150" height="420" rx="14" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
      <rect x="772" y="230" width="106" height="300" rx="8" fill="#10141c"/>
      <rect x="772" y="230" width="106" height="60" fill="#49e2ff" opacity="0.9"/>
    </g>`,
  GPU: () => `
    <rect x="180" y="240" width="840" height="330" rx="26" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
    <rect x="180" y="560" width="840" height="34" rx="8" fill="#d6ff3f" opacity="0.85"/>
    ${fan(380, 405)}${fan(640, 405)}
    <rect x="820" y="300" width="150" height="210" rx="12" fill="#10141c"/>`,
  STORAGE: (item) => item.specs && item.specs.storageType === "SATA" ? `
    <rect x="330" y="220" width="540" height="360" rx="26" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
    <rect x="380" y="270" width="440" height="160" rx="12" fill="#10141c"/>
    <text x="600" y="380" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="64" font-weight="700">SSD</text>
    <circle cx="420" cy="530" r="14" fill="#d6ff3f"/>` : `
    <g transform="rotate(-12 600 400)">
      <rect x="320" y="320" width="620" height="150" rx="16" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
      <rect x="360" y="352" width="120" height="86" rx="8" fill="#10141c"/>
      <rect x="510" y="352" width="200" height="86" rx="8" fill="#10141c"/>
      <rect x="850" y="352" width="60" height="86" rx="8" fill="#d6ff3f"/>
    </g>`,
  PSU: () => `
    <rect x="330" y="200" width="540" height="420" rx="22" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
    <circle cx="600" cy="410" r="150" fill="#10141c" stroke="#d6ff3f" stroke-width="6"/>
    ${blades(600, 410, 110)}
    <rect x="790" y="250" width="50" height="50" rx="8" fill="#49e2ff" opacity="0.8"/>`,
  CASE: () => `
    <rect x="400" y="90" width="400" height="640" rx="26" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
    <rect x="430" y="130" width="280" height="480" rx="14" fill="#0d1118" stroke="#49e2ff" stroke-width="3" opacity="0.95"/>
    <rect x="730" y="130" width="40" height="480" rx="10" fill="#10141c"/>
    <circle cx="750" cy="170" r="10" fill="#d6ff3f"/>
    <rect x="430" y="640" width="340" height="26" rx="10" fill="#2c3442"/>`,
  COOLING: (item) => /aio/i.test(item.name) ? `
    <rect x="240" y="140" width="720" height="180" rx="20" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
    ${fan(380, 230)}${fan(600, 230)}${fan(820, 230)}
    <path d="M 600 320 C 600 420, 520 440, 520 520" stroke="#49e2ff" stroke-width="18" fill="none" stroke-linecap="round"/>
    <circle cx="520" cy="580" r="90" fill="#10141c" stroke="#d6ff3f" stroke-width="6"/>` : `
    <rect x="420" y="140" width="360" height="500" rx="18" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${445 + i * 45}" y="170" width="22" height="440" rx="8" fill="#8f9bb0" opacity="${0.95 - i * 0.06}"/>`).join("")}
    <circle cx="600" cy="390" r="120" fill="#10141c" stroke="#d6ff3f" stroke-width="6"/>
    ${blades(600, 390, 88)}`,
  LAPTOP: () => `
    <rect x="280" y="140" width="640" height="400" rx="22" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
    <rect x="310" y="170" width="580" height="330" rx="10" fill="#07090e"/>
    <text x="600" y="360" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="72" font-weight="700">&#9654;</text>
    <path d="M 220 560 L 980 560 L 1040 640 L 160 640 Z" fill="#232a37" stroke="#454e5e" stroke-width="4"/>
    <rect x="500" y="586" width="200" height="24" rx="10" fill="#10141c"/>`,
  MONITOR: () => `
    <rect x="220" y="130" width="760" height="470" rx="24" fill="#161922" stroke="#454e5e" stroke-width="6"/>
    <rect x="250" y="160" width="700" height="400" rx="10" fill="#07090e"/>
    <text x="600" y="350" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="88" font-weight="700">GAME</text>
    <text x="600" y="430" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="44">READY</text>
    <rect x="575" y="620" width="50" height="70" fill="#2c313c"/>
    <rect x="460" y="690" width="280" height="20" rx="8" fill="#3c4250"/>`,
  PERIPHERAL: (item) => peripheralGlyph(item.specs && item.specs.kind)
};

function pins(x, y) {
  let out = "";
  for (let i = 0; i < 9; i++) {
    out += `<rect x="${x + 24 + i * 56}" y="${y - 26}" width="18" height="26" rx="4" fill="#8f9bb0"/>`;
    out += `<rect x="${x + 24 + i * 56}" y="${y + 540}" width="18" height="26" rx="4" fill="#8f9bb0"/>`;
  }
  return out;
}

function fan(cx, cy) {
  return `
    <circle cx="${cx}" cy="${cy}" r="95" fill="#0e1116" stroke="#d6ff3f" stroke-width="6"/>
    ${blades(cx, cy, 68)}
    <circle cx="${cx}" cy="${cy}" r="22" fill="#2a3140"/>`;
}

function blades(cx, cy, r) {
  let out = "";
  for (let i = 0; i < 7; i++) {
    out += `<path d="M ${cx} ${cy} q ${r * 0.7} ${-r * 0.25} ${r} ${-r * 0.75} q ${-r * 0.55} ${r * 0.3} ${-r} ${r * 0.75}" fill="#3a4356" transform="rotate(${i * 51.4} ${cx} ${cy})"/>`;
  }
  return out;
}

function peripheralGlyph(kind) {
  switch (kind) {
    case "keyboard":
      return `
        <rect x="230" y="280" width="740" height="240" rx="22" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
        ${[0, 1, 2, 3].map((row) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) =>
          `<rect x="${262 + col * 68}" y="${308 + row * 52}" width="54" height="40" rx="7" fill="${row === 3 && col > 2 && col < 7 ? "#d6ff3f" : "#10141c"}"/>`).join("")).join("")}`;
    case "mouse":
      return `
        <ellipse cx="600" cy="400" rx="190" ry="250" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
        <line x1="600" y1="150" x2="600" y2="330" stroke="#454e5e" stroke-width="5"/>
        <rect x="578" y="250" width="44" height="90" rx="20" fill="#d6ff3f"/>
        <path d="M 600 150 C 640 90, 720 80, 780 60" stroke="#49e2ff" stroke-width="10" fill="none"/>`;
    case "headset":
      return `
        <path d="M 380 480 C 380 260, 820 260, 820 480" stroke="#454e5e" stroke-width="34" fill="none"/>
        <rect x="330" y="430" width="120" height="200" rx="40" fill="#1c222e" stroke="#d6ff3f" stroke-width="6"/>
        <rect x="750" y="430" width="120" height="200" rx="40" fill="#1c222e" stroke="#d6ff3f" stroke-width="6"/>
        <path d="M 810 620 C 760 700, 660 710, 600 700" stroke="#49e2ff" stroke-width="14" fill="none" stroke-linecap="round"/>`;
    default:
      return `
        <rect x="220" y="240" width="760" height="340" rx="26" fill="#1c222e" stroke="#454e5e" stroke-width="6"/>
        <rect x="250" y="270" width="700" height="280" rx="16" fill="#10141c"/>
        <text x="600" y="440" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="64" font-weight="700">APEX</text>`;
  }
}

const publicBase = (process.env.MINIO_PUBLIC_URL || "http://127.0.0.1:9000").replace(/\/$/, "");
const bucket = process.env.MINIO_BUCKET || "catalog";
const updates = [];

for (const item of items) {
  const hue = item.hue ?? 160;
  const draw = glyph[item.category] || glyph.PERIPHERAL;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 34% 24%)"/>
      <stop offset="1" stop-color="#090b10"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0" stop-color="hsl(${hue} 90% 60%)" stop-opacity="0.28"/>
      <stop offset="1" stop-color="hsl(${hue} 90% 60%)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#glow)"/>
  ${draw(item)}
  <text x="48" y="806" fill="#9aa8ba" font-family="Segoe UI, sans-serif" font-size="24" letter-spacing="6">${esc(item.brand.toUpperCase())}</text>
  <text x="48" y="846" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="34" font-weight="700">${esc(item.name)}</text>
  <text x="48" y="880" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="22">${esc(specLine(item))}</text>
</svg>
`;
  fs.writeFileSync(path.join(outDir, item.sku + ".svg"), svg);
  updates.push("UPDATE products SET image_url = " + sql(publicBase + "/" + bucket + "/" + item.sku + ".svg?v=2") + " WHERE sku = " + sql(item.sku) + ";");
}

fs.writeFileSync(path.join(__dirname, "image-urls-house.sql"), ["BEGIN;", ...updates, "COMMIT;", ""].join("\n"));
console.log("Wrote " + items.length + " house images to " + outDir);
