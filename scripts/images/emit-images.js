const fs = require("fs");
const path = require("path");
const { items } = require("../catalog/emit-sql");

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

function monitor(item) {
  const s = item.specs;
  return `
    <rect x="40" y="28" width="1120" height="700" rx="28" fill="#161922"/>
    <rect x="64" y="52" width="1072" height="590" rx="10" fill="#07090e"/>
    <text x="600" y="250" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="72" font-weight="700">${esc(s.resolution)}</text>
    <text x="600" y="330" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="40">${esc(s.panel)} · ${esc(s.refreshHz)} Hz</text>
    <text x="600" y="390" text-anchor="middle" fill="#c5d0df" font-family="Segoe UI, sans-serif" font-size="30">${esc(s.responseMs)} ms · ${esc(s.hdr)} · ${esc(s.curve)}</text>
    <text x="600" y="500" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="36">${esc(item.brand)} ${esc(item.name)}</text>
    <rect x="548" y="656" width="104" height="36" fill="#2c313c"/>
    <rect x="430" y="692" width="340" height="18" rx="6" fill="#3c4250"/>`;
}

function cpu(item) {
  const s = item.specs;
  return `
    <rect x="230" y="48" width="740" height="680" rx="40" fill="#d5dbe3"/>
    <rect x="230" y="48" width="740" height="120" fill="#ffffff33"/>
    <rect x="310" y="170" width="580" height="430" rx="16" fill="#1b2430"/>
    <text x="600" y="330" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="96" font-weight="700">${esc(s.cores)}</text>
    <text x="600" y="390" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="32">${esc(s.threads)} threads · ${esc(s.cacheMb)} MB cache</text>
    <text x="600" y="450" text-anchor="middle" fill="#d5dbe3" font-family="Segoe UI, sans-serif" font-size="30">${esc(s.baseGhz)}–${esc(s.boostGhz)} GHz · ${esc(s.socket)}</text>
    <text x="600" y="510" text-anchor="middle" fill="#9aa8ba" font-family="Segoe UI, sans-serif" font-size="26">${esc(s.graphics)} · ${esc(s.memory)}</text>`;
}

function gpu(item) {
  const s = item.specs;
  return `
    <rect x="36" y="150" width="1128" height="520" rx="28" fill="#1a1e27"/>
    <circle cx="250" cy="390" r="130" fill="#0e1116" stroke="#d6ff3f" stroke-width="10"/>
    <circle cx="250" cy="390" r="46" fill="#2a3140"/>
    <circle cx="560" cy="390" r="130" fill="#0e1116" stroke="#ffffff" stroke-width="10"/>
    <circle cx="560" cy="390" r="46" fill="#2a3140"/>
    <rect x="760" y="210" width="340" height="360" rx="18" fill="#10141b"/>
    <text x="930" y="340" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="64" font-weight="700">${esc(s.vramGb)} GB</text>
    <text x="930" y="400" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="28">${esc(s.memoryType)}</text>
    <text x="930" y="450" text-anchor="middle" fill="#c5d0df" font-family="Segoe UI, sans-serif" font-size="24">${esc(s.tdpWatts)} W · ${esc(s.lengthMm)} mm</text>`;
}

function ram(item) {
  const s = item.specs;
  return `
    <rect x="250" y="70" width="280" height="640" rx="16" fill="#1c2430" stroke="#d6ff3f" stroke-width="8"/>
    <rect x="670" y="70" width="280" height="640" rx="16" fill="#1c2430" stroke="#ffffff" stroke-width="8"/>
    <text x="390" y="360" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="42" font-weight="700">${esc(s.ramType)}</text>
    <text x="810" y="360" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="42" font-weight="700">${esc(s.speedMt)}</text>
    <text x="600" y="430" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="36">${esc(s.modules)} · CL${esc(s.cas)}</text>`;
}

function board(item) {
  const s = item.specs;
  return `
    <rect x="80" y="50" width="1040" height="670" rx="20" fill="#12331f"/>
    <rect x="140" y="120" width="360" height="360" fill="#0c1f14" stroke="#d6ff3f" stroke-width="8"/>
    <text x="320" y="290" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="48" font-weight="700">${esc(s.socket)}</text>
    <text x="320" y="350" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="32">${esc(s.chipset)}</text>
    <text x="760" y="240" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="36">${esc(s.ramSlots)} DIMM · ${esc(s.ramType)}</text>
    <text x="760" y="310" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="36">${esc(s.m2Slots)}x M.2</text>
    <text x="760" y="380" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="32">${esc(s.wifi)}</text>
    <text x="760" y="450" fill="#c5d0df" font-family="Segoe UI, sans-serif" font-size="28">${esc(s.formFactor)} · ${esc(s.pcie)}</text>`;
}

function storage(item) {
  const s = item.specs;
  const wide = s.form === "3.5-inch";
  const body = wide
    ? `<rect x="160" y="220" width="880" height="360" rx="16" fill="#222833"/>`
    : `<rect x="180" y="250" width="840" height="280" rx="18" fill="#222833"/>`;
  return `
    ${body}
    <text x="600" y="390" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="64" font-weight="700">${esc(s.readMBps)} MB/s</text>
    <text x="600" y="450" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="30">${esc(s.interface)} · ${esc(s.form)}</text>`;
}

function psu(item) {
  const s = item.specs;
  return `
    <rect x="120" y="140" width="960" height="520" rx="24" fill="#1b1f28"/>
    <circle cx="420" cy="400" r="150" fill="#10141b" stroke="#d6ff3f" stroke-width="12"/>
    <text x="420" y="390" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="48" font-weight="700">${esc(s.wattage)}W</text>
    <text x="780" y="360" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="36">${esc(s.efficiency)}</text>
    <text x="780" y="420" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="28">${esc(s.modular)}</text>
    <text x="780" y="470" text-anchor="middle" fill="#c5d0df" font-family="Segoe UI, sans-serif" font-size="26">${esc(s.formFactor)}</text>`;
}

function pcCase(item) {
  const s = item.specs;
  return `
    <rect x="360" y="40" width="480" height="690" rx="24" fill="#171b24" stroke="#d6ff3f" stroke-width="8"/>
    <rect x="400" y="90" width="400" height="260" rx="8" fill="#0e1218"/>
    <text x="600" y="430" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="42" font-weight="700">${esc(s.formFactor)}</text>
    <text x="600" y="490" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="28">GPU to ${esc(s.maxGpuLengthMm)} mm</text>
    <text x="600" y="540" text-anchor="middle" fill="#c5d0df" font-family="Segoe UI, sans-serif" font-size="26">${esc(s.radiatorMm)} mm radiator</text>`;
}

function cooling(item) {
  const s = item.specs;
  if (s.style === "Liquid") {
    return `
      <rect x="160" y="180" width="880" height="220" rx="110" fill="none" stroke="#d6ff3f" stroke-width="16"/>
      <rect x="220" y="460" width="180" height="180" rx="20" fill="#1b1f28" stroke="#ffffff" stroke-width="8"/>
      <rect x="800" y="460" width="180" height="180" rx="20" fill="#1b1f28" stroke="#ffffff" stroke-width="8"/>
      <text x="600" y="300" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="64" font-weight="700">${esc(s.sizeMm)} mm</text>`;
  }
  return `
    <rect x="430" y="60" width="340" height="620" rx="20" fill="#2a241c"/>
    <rect x="250" y="160" width="700" height="70" rx="8" fill="#3a3328"/>
    <rect x="250" y="280" width="700" height="70" rx="8" fill="#3a3328"/>
    <text x="600" y="500" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="48" font-weight="700">${esc(s.heightMm)} mm</text>
    <text x="600" y="560" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="28">${esc(s.fans)} · ${esc(s.tdpWatts)} W</text>`;
}

function laptop(item) {
  const s = item.specs;
  return `
    <rect x="70" y="70" width="1060" height="620" rx="28" fill="#1a1e27"/>
    <rect x="100" y="100" width="1000" height="500" rx="8" fill="#07090e"/>
    <text x="600" y="280" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="52" font-weight="700">${esc(s.resolution)}</text>
    <text x="600" y="350" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="32">${esc(s.refreshHz)} Hz · ${esc(s.gpu)}</text>
    <text x="600" y="420" text-anchor="middle" fill="#c5d0df" font-family="Segoe UI, sans-serif" font-size="28">${esc(s.processor)}</text>
    <text x="600" y="480" text-anchor="middle" fill="#c5d0df" font-family="Segoe UI, sans-serif" font-size="28">${esc(s.memory)} · ${esc(s.storage)}</text>`;
}

function peripheral(item) {
  const s = item.specs;
  return `
    <rect x="140" y="120" width="920" height="520" rx="40" fill="#1b1f28"/>
    <text x="600" y="300" text-anchor="middle" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="28">${esc(String(s.kind).toUpperCase())}</text>
    <text x="600" y="380" text-anchor="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="48" font-weight="700">${esc(s.sensor)}</text>
    <text x="600" y="450" text-anchor="middle" fill="#c5d0df" font-family="Segoe UI, sans-serif" font-size="30">${esc(s.connection)} · ${esc(s.detail)}</text>`;
}

function body(item) {
  switch (item.category) {
    case "MONITOR": return monitor(item);
    case "CPU": return cpu(item);
    case "GPU": return gpu(item);
    case "RAM": return ram(item);
    case "MOTHERBOARD": return board(item);
    case "STORAGE": return storage(item);
    case "PSU": return psu(item);
    case "CASE": return pcCase(item);
    case "COOLING": return cooling(item);
    case "LAPTOP": return laptop(item);
    default: return peripheral(item);
  }
}

function caption(item) {
  const s = item.specs;
  switch (item.category) {
    case "MONITOR": return s.sizeInches + '" ' + s.panel + "  ·  " + s.resolution + "  ·  " + s.refreshHz + " Hz";
    case "CPU": return s.cores + " cores  ·  " + s.boostGhz + " GHz  ·  " + s.socket;
    case "GPU": return s.vramGb + " GB " + s.memoryType + "  ·  " + s.tdpWatts + " W  ·  " + s.lengthMm + " mm";
    case "RAM": return s.modules + "  ·  " + s.ramType + "-" + s.speedMt + "  ·  CL" + s.cas;
    case "MOTHERBOARD": return s.chipset + "  ·  " + s.socket + "  ·  " + s.ramType;
    case "STORAGE": return s.interface + "  ·  " + s.readMBps + " MB/s read";
    case "PSU": return s.wattage + " W  ·  " + s.efficiency + "  ·  " + s.modular;
    case "CASE": return s.formFactor + "  ·  GPU " + s.maxGpuLengthMm + " mm  ·  " + s.radiatorMm + " mm rad";
    case "COOLING": return s.style + "  ·  " + (s.sizeMm ? s.sizeMm + " mm" : s.heightMm + " mm") + "  ·  " + s.tdpWatts + " W";
    case "LAPTOP": return s.resolution + "  ·  " + s.gpu + "  ·  " + s.memory;
    default: return s.connection + "  ·  " + s.sensor;
  }
}

const publicBase = (process.env.MINIO_PUBLIC_URL || "http://127.0.0.1:9000").replace(/\/$/, "");
const bucket = process.env.MINIO_BUCKET || "catalog";
const updates = [];

for (const item of items) {
  const hue = item.hue;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 32% 22%)"/>
      <stop offset="1" stop-color="#090b10"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  ${body(item)}
  <text x="48" y="820" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="28">${esc(item.brand)} ${esc(item.name)}</text>
  <text x="48" y="862" fill="#d6ff3f" font-family="Segoe UI, sans-serif" font-size="24">${esc(caption(item))}</text>
</svg>
`;
  fs.writeFileSync(path.join(outDir, item.sku + ".svg"), svg);
  updates.push("UPDATE products SET image_url = " + sql(publicBase + "/" + bucket + "/" + item.sku + ".svg?v=2") + " WHERE sku = " + sql(item.sku) + ";");
}

fs.writeFileSync(path.join(__dirname, "image-urls.sql"), ["BEGIN;", ...updates, "COMMIT;", ""].join("\n"));
console.log("Wrote " + items.length + " images to " + outDir);
