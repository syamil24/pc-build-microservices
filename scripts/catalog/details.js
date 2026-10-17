// Published shelf specs merged onto the compatibility fields already on each product.
// Compatibility keys (socket, tdpWatts, ramType, formFactor, lengthMm, maxGpuLengthMm, wattage) stay as the pump stored them.

const cpus = {
  "CPU-R5-5600": [6, 12, 3.5, 4.4, 32, "None", "DDR4"],
  "CPU-R5-5600X": [6, 12, 3.7, 4.6, 32, "None", "DDR4"],
  "CPU-R7-5700X": [8, 16, 3.4, 4.6, 32, "None", "DDR4"],
  "CPU-R7-5800X3D": [8, 16, 3.4, 4.5, 96, "None", "DDR4"],
  "CPU-R5-7600": [6, 12, 3.8, 5.1, 32, "Radeon Graphics", "DDR5"],
  "CPU-R5-7600X": [6, 12, 4.7, 5.3, 32, "Radeon Graphics", "DDR5"],
  "CPU-R7-7700": [8, 16, 3.8, 5.3, 32, "Radeon Graphics", "DDR5"],
  "CPU-R7-7700X": [8, 16, 4.5, 5.4, 32, "Radeon Graphics", "DDR5"],
  "CPU-R7-7800X3D": [8, 16, 4.2, 5.0, 96, "Radeon Graphics", "DDR5"],
  "CPU-R9-7900X": [12, 24, 4.7, 5.6, 64, "Radeon Graphics", "DDR5"],
  "CPU-R9-7950X": [16, 32, 4.5, 5.7, 64, "Radeon Graphics", "DDR5"],
  "CPU-R5-9600X": [6, 12, 3.9, 5.4, 32, "Radeon Graphics", "DDR5"],
  "CPU-R7-9700X": [8, 16, 3.8, 5.5, 32, "Radeon Graphics", "DDR5"],
  "CPU-R7-9800X3D": [8, 16, 4.7, 5.2, 96, "Radeon Graphics", "DDR5"],
  "CPU-R9-9900X": [12, 24, 4.4, 5.6, 64, "Radeon Graphics", "DDR5"],
  "CPU-R9-9950X": [16, 32, 4.3, 5.7, 64, "Radeon Graphics", "DDR5"],
  "CPU-I5-12400F": [6, 12, 2.5, 4.4, 18, "None", "DDR4 or DDR5"],
  "CPU-I5-13400F": [10, 16, 2.5, 4.6, 20, "None", "DDR4 or DDR5"],
  "CPU-I5-13600K": [14, 20, 3.5, 5.1, 24, "UHD Graphics 770", "DDR4 or DDR5"],
  "CPU-I7-13700K": [16, 24, 3.4, 5.4, 30, "UHD Graphics 770", "DDR4 or DDR5"],
  "CPU-I5-14400F": [10, 16, 2.5, 4.7, 20, "None", "DDR4 or DDR5"],
  "CPU-I5-14600K": [14, 20, 3.5, 5.3, 24, "UHD Graphics 770", "DDR4 or DDR5"],
  "CPU-I7-14700F": [20, 28, 2.1, 5.4, 33, "None", "DDR4 or DDR5"],
  "CPU-I7-14700K": [20, 28, 3.4, 5.6, 33, "UHD Graphics 770", "DDR4 or DDR5"],
  "CPU-I9-14900K": [24, 32, 3.2, 6.0, 36, "UHD Graphics 770", "DDR4 or DDR5"],
  "CPU-U5-245K": [14, 14, 4.2, 5.2, 24, "Arc Graphics", "DDR5"],
  "CPU-U7-265K": [20, 20, 3.9, 5.5, 30, "Arc Graphics", "DDR5"],
  "CPU-U9-285K": [24, 24, 3.7, 5.7, 36, "Arc Graphics", "DDR5"]
};

const monitors = {
  "MON-LG-27GP850": ["Nano IPS", 1, "G-Sync Compatible, FreeSync Premium", "DisplayHDR 400"],
  "MON-LG-32GQ850": ["Nano IPS", 1, "G-Sync Compatible, FreeSync Premium", "DisplayHDR 600"],
  "MON-LG-34GP63": ["VA", 5, "FreeSync Premium", "HDR10"],
  "MON-SAM-G5-27": ["VA", 1, "FreeSync", "HDR10"],
  "MON-SAM-G6-27": ["VA", 1, "FreeSync Premium Pro", "DisplayHDR 600"],
  "MON-SAM-G7-32": ["VA", 1, "G-Sync Compatible, FreeSync Premium Pro", "DisplayHDR 600"],
  "MON-SAM-G9-49": ["VA", 1, "G-Sync Compatible, FreeSync Premium Pro", "DisplayHDR 1000"],
  "MON-ASUS-VG27AQ": ["IPS", 1, "G-Sync Compatible, FreeSync", "HDR10"],
  "MON-ASUS-XG27AQ": ["IPS", 1, "G-Sync Compatible, FreeSync", "DisplayHDR 400"],
  "MON-ASUS-PG27AQ": ["OLED", 0.03, "G-Sync", "HDR True Black 400"],
  "MON-DELL-S2722": ["VA", 1, "FreeSync Premium", "HDR10"],
  "MON-DELL-AW2724": ["IPS", 1, "G-Sync Compatible, FreeSync Premium", "DisplayHDR 400"],
  "MON-GB-M27Q": ["IPS", 1, "FreeSync Premium", "HDR10"],
  "MON-GB-G27Q": ["IPS", 1, "FreeSync Premium", "HDR10"],
  "MON-BENQ-XL2546": ["TN", 0.5, "DyAc", "None"],
  "MON-AOC-Q27G3": ["Mini-LED VA", 1, "FreeSync Premium", "DisplayHDR 1000"]
};

const laptops = {
  "LAP-ROG-STRIX-G16": ["2560x1600", 240, "Core i7-14650HX", "16 GB DDR5", "1 TB NVMe"],
  "LAP-ROG-ZEPH-G14": ["2880x1800", 120, "Ryzen 9 8945HS", "16 GB LPDDR5X", "1 TB NVMe"],
  "LAP-TUF-A15": ["1920x1080", 144, "Ryzen 5 7535HS", "16 GB DDR5", "512 GB NVMe"],
  "LAP-TUF-F15": ["1920x1080", 144, "Core i7-13620H", "16 GB DDR5", "512 GB NVMe"],
  "LAP-LEGION-5": ["2560x1600", 165, "Ryzen 7 7735HS", "16 GB DDR5", "1 TB NVMe"],
  "LAP-LEGION-PRO-7": ["2560x1600", 240, "Core i9-14900HX", "32 GB DDR5", "1 TB NVMe"],
  "LAP-LOQ-15": ["1920x1080", 144, "Core i5-13420H", "16 GB DDR5", "512 GB NVMe"],
  "LAP-KATANA-15": ["1920x1080", 144, "Core i7-13620H", "16 GB DDR5", "512 GB NVMe"],
  "LAP-RAIDER-18": ["2560x1600", 120, "Core i9-14900HX", "32 GB DDR5", "2 TB NVMe"],
  "LAP-STEALTH-16": ["2560x1600", 240, "Core Ultra 9 185H", "32 GB LPDDR5X", "1 TB NVMe"],
  "LAP-NITRO-V": ["1920x1080", 144, "Core i5-13420H", "16 GB DDR5", "512 GB NVMe"],
  "LAP-PRED-HELIOS": ["2560x1600", 165, "Core i7-14700HX", "16 GB DDR5", "1 TB NVMe"],
  "LAP-OMEN-16": ["2560x1440", 165, "Ryzen 7 7840HS", "16 GB DDR5", "1 TB NVMe"],
  "LAP-VICTUS-15": ["1920x1080", 144, "Ryzen 5 7535HS", "16 GB DDR5", "512 GB NVMe"],
  "LAP-G15-5530": ["1920x1080", 165, "Core i7-13650HX", "16 GB DDR5", "512 GB NVMe"],
  "LAP-ALIEN-M16": ["2560x1600", 240, "Core Ultra 7 155H", "16 GB DDR5", "1 TB NVMe"],
  "LAP-BLADE-14": ["2560x1600", 240, "Ryzen 9 8945HS", "16 GB LPDDR5X", "1 TB NVMe"],
  "LAP-BLADE-16": ["2560x1600", 240, "Core i9-14900HX", "32 GB DDR5", "1 TB NVMe"],
  "LAP-AORUS-15": ["1920x1080", 165, "Core i7-13700H", "16 GB DDR5", "1 TB NVMe"],
  "LAP-FRAMEWORK-13": ["2256x1504", 120, "Ryzen 7 7840U", "16 GB DDR5", "512 GB NVMe"],
  "LAP-MBA-13-M3": ["2560x1664", 60, "Apple M3", "16 GB unified", "512 GB SSD"],
  "LAP-MBP-14-M4": ["3024x1964", 120, "Apple M4", "16 GB unified", "512 GB SSD"],
  "LAP-XPS-14": ["3200x2000", 90, "Core Ultra 7 155H", "16 GB LPDDR5X", "512 GB NVMe"],
  "LAP-SURFACE-LAP-7": ["2304x1536", 120, "Snapdragon X Elite", "16 GB LPDDR5X", "512 GB SSD"]
};

const drives = {
  "SSD-SAM-980-1": ["PCIe 4.0 x4", "M.2 2280", 5000, 4200],
  "SSD-SAM-990-2": ["PCIe 4.0 x4", "M.2 2280", 7450, 6900],
  "SSD-SAM-990-4": ["PCIe 4.0 x4", "M.2 2280", 7450, 6900],
  "SSD-SAM-870-1": ["SATA III", "2.5-inch", 560, 530],
  "SSD-WD-SN850X-1": ["PCIe 4.0 x4", "M.2 2280", 7300, 6300],
  "SSD-WD-SN850X-2": ["PCIe 4.0 x4", "M.2 2280", 7300, 6600],
  "SSD-WD-SN770-1": ["PCIe 4.0 x4", "M.2 2280", 5150, 4900],
  "SSD-WD-SN580-2": ["PCIe 4.0 x4", "M.2 2280", 4150, 4150],
  "SSD-CRU-P3P-2": ["PCIe 4.0 x4", "M.2 2280", 5000, 4200],
  "SSD-CRU-T500-2": ["PCIe 4.0 x4", "M.2 2280", 7400, 7000],
  "SSD-KST-NV2-1": ["PCIe 4.0 x4", "M.2 2280", 3500, 2100],
  "SSD-KST-KC3000-2": ["PCIe 4.0 x4", "M.2 2280", 7000, 7000],
  "SSD-SEA-530R-2": ["PCIe 4.0 x4", "M.2 2280", 7400, 6900],
  "SSD-SEA-BARR-4": ["SATA III", "3.5-inch", 190, 180],
  "SSD-WD-BLUE-4": ["SATA III", "3.5-inch", 180, 180],
  "SSD-SKH-P41-2": ["PCIe 4.0 x4", "M.2 2280", 7000, 6500]
};

const peripherals = {
  "PER-LOG-GPRO-X2": ["2.4 GHz wireless", "HERO 2", "32,000 DPI", "60 g"],
  "PER-LOG-G502X": ["2.4 GHz wireless", "HERO 25K", "25,600 DPI", "13 buttons"],
  "PER-LOG-G915": ["2.4 GHz wireless", "GL low-profile", "TKL", "Lightspeed"],
  "PER-LOG-G733": ["2.4 GHz wireless", "40 mm drivers", "DTS Headphone:X", "29 h battery"],
  "PER-RAZ-DEATHADDER": ["USB", "Focus Pro 30K", "30,000 DPI", "59 g"],
  "PER-RAZ-VIPER-V3": ["2.4 GHz wireless", "Focus Pro 35K", "35,000 DPI", "54 g"],
  "PER-RAZ-HUNTSMAN": ["USB", "Analog optical", "8,000 Hz", "Rapid trigger"],
  "PER-RAZ-BLACKSHARK": ["2.4 GHz wireless", "50 mm drivers", "THX Spatial", "70 h battery"],
  "PER-WOOT-80HE": ["USB", "Hall effect", "8,000 Hz", "Rapid trigger"],
  "PER-KEYCHRON-Q1": ["2.4 GHz / Bluetooth", "Hot-swap gasket", "75%", "QMK / VIA"],
  "PER-KEYCHRON-K2": ["2.4 GHz / Bluetooth", "Low-profile", "75%", "Hot-swap"],
  "PER-STEEL-APEX-PRO": ["USB", "OmniPoint 2.0", "Adjustable actuation", "TKL"],
  "PER-STEEL-ARCTIS": ["2.4 GHz wireless", "ANC", "Hi-res drivers", "Dual battery"],
  "PER-HYPERX-CLOUD3": ["USB", "53 mm drivers", "DTS Spatial", "Memory foam"],
  "PER-HYPERX-ALLOY": ["USB", "HyperX Red", "Full size", "Aluminum frame"],
  "PER-GLORIOUS-MODEL-O": ["USB", "26K optical", "59 g", "Honeycomb shell"],
  "PER-ARTISAN-ZERO": ["Cloth", "XL", "Soft mid", "Stitched edge"],
  "PER-LOG-G640": ["Cloth", "Large", "3 mm", "Rubber base"],
  "PER-ELGATO-4K": ["HDMI 2.1", "4K60 capture", "USB 3.0", "HDR10"],
  "PER-FOCUSRITE-SOLO": ["USB-C", "1 mic input", "1 line input", "24-bit / 192 kHz"]
};

function cpuSheet(sku) {
  const row = cpus[sku];
  if (!row) return null;
  const [cores, threads, baseGhz, boostGhz, cacheMb, graphics, memory] = row;
  return { cores, threads, baseGhz, boostGhz, cacheMb, graphics, memory };
}

function boardSheet(name, specs) {
  const found = name.match(/[ABZX]\d{3}[EI]?/);
  const chipset = found ? found[0] : "Custom";
  const wifi7 = /WiFi7/i.test(name);
  const wifi = wifi7 || /WiFi/i.test(name);
  const itx = specs.formFactor === "ITX";
  const ddr4 = specs.ramType === "DDR4";
  const premium = /X670|X870|Z790|Z890/.test(chipset);
  const slots = itx || /HDV/.test(name) ? 2 : 4;
  const m2 = itx ? 2 : premium ? 4 : 2;
  return {
    chipset,
    ramSlots: slots,
    maxRamGb: ddr4 ? 128 : premium ? 256 : 192,
    m2Slots: m2,
    wifi: wifi7 ? "Wi-Fi 7" : wifi ? "Wi-Fi 6E" : "Ethernet only",
    pcie: specs.socket === "AM4" ? "PCIe 4.0" : "PCIe 5.0"
  };
}

function ramSheet(name, specs) {
  const speed = Number((name.match(/DDR[45]-(\d+)/) || [])[1]);
  const modules = specs.capacityGb >= 64 ? "2 x 32 GB" : specs.capacityGb >= 32 ? "2 x 16 GB" : "2 x 8 GB";
  let cas = specs.ramType === "DDR4" ? (speed >= 3600 ? 18 : 16) : speed >= 6400 ? 32 : speed >= 6000 ? 30 : 40;
  if (/Fury|Crucial|T-Force|Viper/.test(name) && speed === 6000) cas = 36;
  if (/Crucial/.test(name) && specs.ramType === "DDR5" && speed === 5600) cas = 46;
  const voltage = specs.ramType === "DDR4" ? "1.35 V" : speed >= 6400 ? "1.40 V" : "1.35 V";
  return { modules, speedMt: speed, cas, voltage };
}

function gpuSheet(name) {
  let memoryType = "GDDR6";
  if (/RTX 50/.test(name)) memoryType = "GDDR7";
  else if (/4070|4080|4090/.test(name)) memoryType = "GDDR6X";
  let interface = "PCIe 4.0 x16";
  if (/RTX 50|RX 90|Arc B/.test(name)) interface = "PCIe 5.0 x16";
  if (/4060|RX 6600|RX 7600|Arc A750/.test(name)) interface = "PCIe 4.0 x8";
  return { memoryType, interface, outputs: "3x DisplayPort, 1x HDMI" };
}

function driveSheet(sku) {
  const row = drives[sku];
  if (!row) return null;
  const [interface, form, readMBps, writeMBps] = row;
  return { interface, form, readMBps, writeMBps };
}

function psuSheet(name) {
  let efficiency = "80+ Gold";
  if (/HX1200/i.test(name)) efficiency = "80+ Platinum";
  if (/Prime TX/i.test(name)) efficiency = "80+ Titanium";
  const formFactor = /SFX/i.test(name) ? "SFX" : "ATX";
  const modular = /MWE Gold 650/i.test(name) ? "Semi-modular" : "Fully modular";
  return { efficiency, modular, formFactor };
}

function caseSheet(specs) {
  const itx = specs.formFactor === "ITX";
  const matx = specs.formFactor === "mATX";
  return {
    sidePanel: "Tempered glass",
    radiatorMm: itx ? 240 : matx ? 280 : 360,
    motherboardSupport: itx ? "Mini-ITX" : matx ? "mATX, Mini-ITX" : "ATX, mATX, Mini-ITX"
  };
}

function coolingSheet(name) {
  const liquid = /240|360|Liquid|Loop|Kraken|H100|H150/i.test(name);
  if (liquid) {
    const size = /360/.test(name) ? 360 : 240;
    return { style: "Liquid", sizeMm: size, fans: size === 360 ? "3 x 120 mm" : "2 x 120 mm" };
  }
  const low = /L12S/.test(name);
  const dual = /D15|Assassin|Phantom|Pro 5|AK620/.test(name);
  return {
    style: "Air",
    heightMm: low ? 70 : dual ? 165 : 158,
    fans: low ? "1 x 120 mm" : dual ? "2 x 120 mm" : "1 x 120 mm"
  };
}

function monitorSheet(sku) {
  const row = monitors[sku];
  if (!row) return null;
  const [panel, responseMs, sync, hdr] = row;
  const curve = sku === "MON-SAM-G6-27" || sku === "MON-SAM-G7-32" || sku === "MON-SAM-G9-49" ? "1000R" : "Flat";
  return { panel, responseMs, sync, hdr, curve };
}

function laptopSheet(sku) {
  const row = laptops[sku];
  if (!row) return null;
  const [resolution, refreshHz, processor, memory, storage] = row;
  return { resolution, refreshHz, processor, memory, storage };
}

function peripheralSheet(sku) {
  const row = peripherals[sku];
  if (!row) return null;
  const [connection, sensor, detail, extra] = row;
  return { connection, sensor, detail, extra };
}

function sheet(sku, name, category, specs) {
  switch (category) {
    case "CPU": return cpuSheet(sku);
    case "MOTHERBOARD": return boardSheet(name, specs);
    case "RAM": return ramSheet(name, specs);
    case "GPU": return gpuSheet(name);
    case "STORAGE": return driveSheet(sku);
    case "PSU": return psuSheet(name);
    case "CASE": return caseSheet(specs);
    case "COOLING": return coolingSheet(name);
    case "LAPTOP": return laptopSheet(sku);
    case "MONITOR": return monitorSheet(sku);
    case "PERIPHERAL": return peripheralSheet(sku);
    default: return null;
  }
}

module.exports = { sheet };
