import type { Product } from "./types";

const labels: Record<string, string> = {
  cores: "Cores",
  threads: "Threads",
  baseGhz: "Base clock",
  boostGhz: "Boost clock",
  cacheMb: "L3 cache",
  graphics: "Graphics",
  memory: "Memory",
  socket: "Socket",
  tdpWatts: "Power",
  chipset: "Chipset",
  ramType: "Memory type",
  formFactor: "Form factor",
  ramSlots: "Memory slots",
  maxRamGb: "Maximum memory",
  m2Slots: "M.2 slots",
  wifi: "Wireless",
  pcie: "PCIe",
  capacityGb: "Capacity",
  modules: "Kit",
  speedMt: "Speed",
  cas: "CAS latency",
  voltage: "Voltage",
  vramGb: "Memory",
  memoryType: "Memory type",
  lengthMm: "Length",
  interface: "Interface",
  outputs: "Outputs",
  storageType: "Type",
  form: "Form",
  readMBps: "Sequential read",
  writeMBps: "Sequential write",
  wattage: "Wattage",
  efficiency: "Efficiency",
  modular: "Cabling",
  maxGpuLengthMm: "Maximum GPU length",
  sidePanel: "Side panel",
  radiatorMm: "Radiator support",
  motherboardSupport: "Boards",
  style: "Type",
  sizeMm: "Radiator",
  heightMm: "Height",
  fans: "Fans",
  sockets: "Sockets",
  screen: "Screen",
  resolution: "Resolution",
  refreshHz: "Refresh rate",
  processor: "Processor",
  gpu: "Graphics",
  storage: "Storage",
  sizeInches: "Size",
  panel: "Panel",
  responseMs: "Response time",
  sync: "Adaptive sync",
  hdr: "HDR",
  curve: "Curve",
  kind: "Type",
  connection: "Connection",
  sensor: "Sensor",
  detail: "Detail",
  extra: "Extra"
};

const hidden = new Set(["kind"]);

const order: Record<string, string[]> = {
  MONITOR: ["sizeInches", "panel", "resolution", "refreshHz", "responseMs", "sync", "hdr", "curve"],
  CPU: ["cores", "threads", "baseGhz", "boostGhz", "cacheMb", "socket", "tdpWatts", "graphics", "memory"],
  GPU: ["vramGb", "memoryType", "tdpWatts", "lengthMm", "interface", "outputs"],
  RAM: ["modules", "ramType", "capacityGb", "speedMt", "cas", "voltage"],
  MOTHERBOARD: ["chipset", "socket", "formFactor", "ramType", "ramSlots", "maxRamGb", "m2Slots", "wifi", "pcie"],
  STORAGE: ["storageType", "capacityGb", "interface", "form", "readMBps", "writeMBps"],
  PSU: ["wattage", "efficiency", "modular", "formFactor"],
  CASE: ["formFactor", "maxGpuLengthMm", "radiatorMm", "motherboardSupport", "sidePanel"],
  COOLING: ["style", "sizeMm", "heightMm", "fans", "tdpWatts", "sockets"],
  LAPTOP: ["screen", "resolution", "refreshHz", "processor", "gpu", "memory", "storage"],
  PERIPHERAL: ["connection", "sensor", "detail", "extra"]
};

export function specRows(product: Product): { label: string; value: string }[] {
  const specs = product.specs ?? {};
  const preferred = order[product.category] ?? [];
  const keys = [
    ...preferred.filter((key) => key in specs && !hidden.has(key)),
    ...Object.keys(specs).filter((key) => !preferred.includes(key) && !hidden.has(key))
  ];
  return keys.map((key) => ({ label: labels[key] ?? key, value: formatValue(key, specs[key]) }));
}

export function specSummary(product: Product): string {
  const s = product.specs ?? {};
  switch (product.category) {
    case "MONITOR":
      return join([s.sizeInches && `${s.sizeInches}" ${s.panel}`, s.resolution, s.refreshHz && `${s.refreshHz} Hz`, s.responseMs && `${s.responseMs} ms`]);
    case "CPU":
      return join([s.cores && `${s.cores} cores`, s.boostGhz && `${s.boostGhz} GHz`, s.socket, s.cacheMb && `${s.cacheMb} MB`]);
    case "GPU":
      return join([s.vramGb && `${s.vramGb} GB ${s.memoryType ?? ""}`.trim(), s.tdpWatts && `${s.tdpWatts} W`, s.lengthMm && `${s.lengthMm} mm`]);
    case "RAM":
      return join([s.modules, s.speedMt && `${s.ramType}-${s.speedMt}`, s.cas && `CL${s.cas}`]);
    case "MOTHERBOARD":
      return join([s.chipset, s.socket, s.ramType, s.formFactor, s.wifi]);
    case "STORAGE":
      return join([s.capacityGb && capacity(s.capacityGb), s.interface, s.readMBps && `${s.readMBps} MB/s`]);
    case "PSU":
      return join([s.wattage && `${s.wattage} W`, s.efficiency, s.modular]);
    case "CASE":
      return join([s.formFactor, s.maxGpuLengthMm && `GPU ${s.maxGpuLengthMm} mm`, s.radiatorMm && `${s.radiatorMm} mm rad`]);
    case "COOLING":
      return join([s.style, s.sizeMm ? `${s.sizeMm} mm` : s.heightMm && `${s.heightMm} mm`, s.tdpWatts && `${s.tdpWatts} W`]);
    case "LAPTOP":
      return join([s.resolution, s.refreshHz && `${s.refreshHz} Hz`, s.gpu, s.memory]);
    case "PERIPHERAL":
      return join([s.connection, s.sensor, s.detail]);
    default:
      return "";
  }
}

function join(parts: unknown[]): string {
  return parts.filter((part) => part !== undefined && part !== null && part !== "").map(String).join(" · ");
}

function capacity(gb: unknown): string {
  const value = Number(gb);
  if (!Number.isFinite(value)) return String(gb);
  return value >= 1000 ? `${value / 1000} TB` : `${value} GB`;
}

function formatValue(key: string, raw: unknown): string {
  if (Array.isArray(raw)) return raw.join(", ");
  if (raw === null || raw === undefined) return "";
  if (key === "baseGhz" || key === "boostGhz") return `${raw} GHz`;
  if (key === "cacheMb") return `${raw} MB`;
  if (key === "tdpWatts" || key === "wattage") return `${raw} W`;
  if (key === "maxRamGb" || key === "vramGb") return `${raw} GB`;
  if (key === "capacityGb") return capacity(raw);
  if (key === "speedMt") return `${raw} MT/s`;
  if (key === "cas") return `CL${raw}`;
  if (key === "lengthMm" || key === "maxGpuLengthMm" || key === "heightMm" || key === "sizeMm" || key === "radiatorMm") return `${raw} mm`;
  if (key === "readMBps" || key === "writeMBps") return `${raw} MB/s`;
  if (key === "refreshHz") return `${raw} Hz`;
  if (key === "responseMs") return `${raw} ms`;
  if (key === "sizeInches") return `${raw} in`;
  return String(raw);
}
