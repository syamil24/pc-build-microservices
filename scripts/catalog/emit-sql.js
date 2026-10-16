const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const items = [];

function add(sku, name, category, brand, myr, stock, hue, description, specs) {
  if (sku.length > 40) throw new Error("SKU too long: " + sku);
  if (name.length > 160) throw new Error("Name too long: " + name);
  items.push({ sku, name, category, brand, priceCents: Math.round(myr * 100), stock, hue, description, specs });
}

const ALL_SOCKETS = ["AM4", "AM5", "LGA1700", "LGA1851"];

[
  ["R5-5600", "Ryzen 5 5600", 549, 24, "AM4", 65, "6-core Zen 3 chip for a value AM4 rebuild."],
  ["R5-5600X", "Ryzen 5 5600X", 629, 18, "AM4", 65, "Binned 5600 with a higher boost for 1080p."],
  ["R7-5700X", "Ryzen 7 5700X", 749, 16, "AM4", 65, "8-core AM4 part that stays easy to cool."],
  ["R7-5800X3D", "Ryzen 7 5800X3D", 1299, 8, "AM4", 105, "The last great AM4 gaming CPU, with stacked cache."],
  ["R5-7600", "Ryzen 5 7600", 899, 22, "AM5", 65, "6-core AM5 starting point for a new DDR5 build."],
  ["R5-7600X", "Ryzen 5 7600X", 999, 14, "AM5", 105, "Higher-clock 7600 for builders who already own a strong cooler."],
  ["R7-7700", "Ryzen 7 7700", 1399, 12, "AM5", 65, "8-core AM5 chip that ships cool enough for a single tower."],
  ["R7-7700X", "Ryzen 7 7700X", 1549, 10, "AM5", 105, "Creator-friendly 8-core with a higher power target."],
  ["R7-7800X3D", "Ryzen 7 7800X3D", 1899, 9, "AM5", 120, "The 1440p gaming pick of the Zen 4 generation."],
  ["R9-7900X", "Ryzen 9 7900X", 2099, 7, "AM5", 170, "12-core AM5 part for compiles, encodes, and play."],
  ["R9-7950X", "Ryzen 9 7950X", 2699, 5, "AM5", 170, "16-core flagship when the box is a workstation first."],
  ["R5-9600X", "Ryzen 5 9600X", 1199, 16, "AM5", 65, "Zen 5 6-core. Efficient, and enough for high-refresh 1440p."],
  ["R7-9700X", "Ryzen 7 9700X", 1699, 12, "AM5", 65, "8-core Zen 5 with a modest power limit."],
  ["R7-9800X3D", "Ryzen 7 9800X3D", 2399, 8, "AM5", 120, "Current AM5 gaming CPU. Pair it with a dual tower or a 240mm AIO."],
  ["R9-9900X", "Ryzen 9 9900X", 2299, 6, "AM5", 120, "12-core Zen 5 for mixed render and game loads."],
  ["R9-9950X", "Ryzen 9 9950X", 2999, 4, "AM5", 170, "16-core Zen 5 desktop flagship."],
  ["I5-12400F", "Core i5-12400F", 599, 20, "LGA1700", 117, "6 performance cores. A quiet LGA1700 starter."],
  ["I5-13400F", "Core i5-13400F", 799, 16, "LGA1700", 148, "Adds efficiency cores for background apps while gaming."],
  ["I5-13600K", "Core i5-13600K", 1199, 10, "LGA1700", 181, "Unlocked 13th-gen chip. Needs a real cooler."],
  ["I7-13700K", "Core i7-13700K", 1699, 8, "LGA1700", 253, "Hot 16-core hybrid. Plan the case airflow."],
  ["I5-14400F", "Core i5-14400F", 849, 18, "LGA1700", 148, "Current budget Intel gaming CPU."],
  ["I5-14600K", "Core i5-14600K", 1399, 12, "LGA1700", 181, "Unlocked 14th-gen midrange. Strong in games and compiles."],
  ["I7-14700F", "Core i7-14700F", 1649, 9, "LGA1700", 219, "Locked 14700 with a still-hungry power limit."],
  ["I7-14700K", "Core i7-14700K", 1899, 8, "LGA1700", 253, "High-core 14th-gen part. A 240mm cooler is the floor."],
  ["I9-14900K", "Core i9-14900K", 2499, 4, "LGA1700", 253, "14th-gen flagship. Treat the cooler and the PSU as part of the CPU."],
  ["U5-245K", "Core Ultra 5 245K", 1499, 10, "LGA1851", 159, "Arrow Lake midrange on the new Intel socket."],
  ["U7-265K", "Core Ultra 7 265K", 1999, 8, "LGA1851", 250, "Arrow Lake 20-core hybrid for a fresh LGA1851 board."],
  ["U9-285K", "Core Ultra 9 285K", 2799, 4, "LGA1851", 250, "Desktop Core Ultra flagship. DDR5 only."]
].forEach(([sku, name, myr, stock, socket, tdp, description]) => {
  const brand = sku.startsWith("I") || sku.startsWith("U") ? "Intel" : "AMD";
  add("CPU-" + sku, name, "CPU", brand, myr, stock, brand === "AMD" ? 18 : 210, description, { socket, tdpWatts: tdp });
});

function boards(rows) {
  rows.forEach(([sku, name, brand, myr, stock, socket, ramType, formFactor, hue]) => {
    add(sku, name, "MOTHERBOARD", brand, myr, stock, hue, formFactor + " " + socket + " board for " + ramType + ".", { socket, ramType, formFactor });
  });
}
boards([
  ["MB-MSI-B550-TOMAHAWK", "MAG B550 Tomahawk", "MSI", 549, 10, "AM4", "DDR4", "ATX", 12],
  ["MB-ASUS-B550-TUF", "TUF Gaming B550-Plus", "ASUS", 629, 8, "AM4", "DDR4", "ATX", 30],
  ["MB-GB-B550M-DS3H", "B550M DS3H", "Gigabyte", 429, 14, "AM4", "DDR4", "mATX", 140],
  ["MB-ASR-B550M-PRO4", "B550M Pro4", "ASRock", 459, 12, "AM4", "DDR4", "mATX", 200],
  ["MB-MSI-B650-TOMAHAWK", "MAG B650 Tomahawk WiFi", "MSI", 899, 12, "AM5", "DDR5", "ATX", 14],
  ["MB-MSI-B650M-MORTAR", "MAG B650M Mortar WiFi", "MSI", 829, 9, "AM5", "DDR5", "mATX", 16],
  ["MB-ASUS-B650-TUF", "TUF Gaming B650-Plus WiFi", "ASUS", 949, 10, "AM5", "DDR5", "ATX", 32],
  ["MB-ASUS-B650M-TUF", "TUF Gaming B650M-Plus", "ASUS", 799, 8, "AM5", "DDR5", "mATX", 34],
  ["MB-ASUS-X670E-STRIX", "ROG Strix X670E-F", "ASUS", 1699, 5, "AM5", "DDR5", "ATX", 350],
  ["MB-GB-B650-EAGLE", "B650 Eagle AX", "Gigabyte", 749, 11, "AM5", "DDR5", "ATX", 142],
  ["MB-GB-B650M-AORUS", "B650M Aorus Elite AX", "Gigabyte", 829, 8, "AM5", "DDR5", "mATX", 144],
  ["MB-GB-X870-AORUS", "X870 Aorus Elite WiFi7", "Gigabyte", 1499, 6, "AM5", "DDR5", "ATX", 148],
  ["MB-ASR-B650-PRO-RS", "B650 Pro RS", "ASRock", 699, 10, "AM5", "DDR5", "ATX", 202],
  ["MB-ASR-B650I-LIGHTNING", "B650I Lightning WiFi", "ASRock", 899, 6, "AM5", "DDR5", "ITX", 204],
  ["MB-ASUS-B650I-STRIX", "ROG Strix B650E-I", "ASUS", 1399, 4, "AM5", "DDR5", "ITX", 348],
  ["MB-MSI-Z790-TOMAHAWK", "MAG Z790 Tomahawk WiFi", "MSI", 1199, 8, "LGA1700", "DDR5", "ATX", 20],
  ["MB-MSI-B760-TOMAHAWK", "MAG B760 Tomahawk WiFi", "MSI", 849, 10, "LGA1700", "DDR5", "ATX", 22],
  ["MB-MSI-B760M-MORTAR", "MAG B760M Mortar WiFi", "MSI", 749, 9, "LGA1700", "DDR5", "mATX", 24],
  ["MB-ASUS-B760-TUF", "TUF Gaming B760-Plus WiFi", "ASUS", 829, 9, "LGA1700", "DDR5", "ATX", 36],
  ["MB-ASUS-B760M-D4", "TUF Gaming B760M-Plus D4", "ASUS", 699, 8, "LGA1700", "DDR4", "mATX", 38],
  ["MB-GB-B760-DS3H-D4", "B760 DS3H DDR4", "Gigabyte", 549, 12, "LGA1700", "DDR4", "ATX", 150],
  ["MB-ASR-B760M-D4", "B760M-HDV/M.2 DDR4", "ASRock", 429, 14, "LGA1700", "DDR4", "mATX", 206],
  ["MB-ASUS-Z790-STRIX", "ROG Strix Z790-F", "ASUS", 1799, 4, "LGA1700", "DDR5", "ATX", 352],
  ["MB-MSI-Z890-TOMAHAWK", "MAG Z890 Tomahawk WiFi", "MSI", 1399, 7, "LGA1851", "DDR5", "ATX", 26],
  ["MB-ASUS-Z890-TUF", "TUF Gaming Z890-Plus WiFi", "ASUS", 1299, 7, "LGA1851", "DDR5", "ATX", 40],
  ["MB-GB-Z890-AORUS", "Z890 Aorus Elite WiFi7", "Gigabyte", 1349, 6, "LGA1851", "DDR5", "ATX", 152],
  ["MB-ASR-Z890-PRO-RS", "Z890 Pro RS WiFi", "ASRock", 1099, 6, "LGA1851", "DDR5", "ATX", 208],
  ["MB-ASUS-Z890I-STRIX", "ROG Strix Z890-I", "ASUS", 1999, 3, "LGA1851", "DDR5", "ITX", 354]
]);

[
  ["COR-D4-16-3200", "Vengeance LPX 16GB DDR4-3200", "Corsair", 199, "DDR4", 16],
  ["COR-D4-32-3600", "Vengeance LPX 32GB DDR4-3600", "Corsair", 329, "DDR4", 32],
  ["GSK-D4-16-3600", "Ripjaws V 16GB DDR4-3600", "G.Skill", 219, "DDR4", 16],
  ["GSK-D4-32-3600", "Ripjaws V 32GB DDR4-3600", "G.Skill", 349, "DDR4", 32],
  ["KST-D4-16-3200", "Fury Beast 16GB DDR4-3200", "Kingston", 189, "DDR4", 16],
  ["CRU-D4-32-3200", "Pro 32GB DDR4-3200", "Crucial", 299, "DDR4", 32],
  ["COR-D5-32-6000", "Vengeance 32GB DDR5-6000", "Corsair", 499, "DDR5", 32],
  ["COR-D5-64-6000", "Vengeance 64GB DDR5-6000", "Corsair", 899, "DDR5", 64],
  ["GSK-D5-32-6000", "Trident Z5 Neo 32GB DDR5-6000", "G.Skill", 549, "DDR5", 32],
  ["GSK-D5-32-6400", "Trident Z5 RGB 32GB DDR5-6400", "G.Skill", 629, "DDR5", 32],
  ["GSK-D5-64-6400", "Trident Z5 64GB DDR5-6400", "G.Skill", 1099, "DDR5", 64],
  ["KST-D5-32-6000", "Fury Beast 32GB DDR5-6000", "Kingston", 469, "DDR5", 32],
  ["KST-D5-16-5600", "Fury Beast 16GB DDR5-5600", "Kingston", 279, "DDR5", 16],
  ["CRU-D5-32-5600", "Pro 32GB DDR5-5600", "Crucial", 429, "DDR5", 32],
  ["TEAM-D5-32-6000", "T-Force Delta 32GB DDR5-6000", "TeamGroup", 459, "DDR5", 32],
  ["PAT-D5-32-6000", "Viper Venom 32GB DDR5-6000", "Patriot", 439, "DDR5", 32]
].forEach(([sku, name, brand, myr, ramType, capacityGb], index) => {
  add("RAM-" + sku, name, "RAM", brand, myr, 18 - (index % 6), 40 + index * 8, "2-stick " + ramType + " kit, " + capacityGb + "GB.", { ramType, capacityGb });
});

[
  ["RTX3060-12", "GeForce RTX 3060 12GB", "NVIDIA", 1199, 170, 242, 12],
  ["RTX4060-8", "GeForce RTX 4060 8GB", "NVIDIA", 1499, 115, 240, 8],
  ["RTX4060TI-16", "GeForce RTX 4060 Ti 16GB", "NVIDIA", 1999, 165, 250, 16],
  ["RTX4070-12", "GeForce RTX 4070 12GB", "NVIDIA", 2499, 200, 285, 12],
  ["RTX4070S-12", "GeForce RTX 4070 Super 12GB", "NVIDIA", 2799, 220, 300, 12],
  ["RTX4070TI-S", "GeForce RTX 4070 Ti Super 16GB", "NVIDIA", 3499, 285, 310, 16],
  ["RTX4080S-16", "GeForce RTX 4080 Super 16GB", "NVIDIA", 4999, 320, 330, 16],
  ["RTX4090-24", "GeForce RTX 4090 24GB", "NVIDIA", 8999, 450, 340, 24],
  ["RTX5070-12", "GeForce RTX 5070 12GB", "NVIDIA", 2999, 250, 290, 12],
  ["RTX5080-16", "GeForce RTX 5080 16GB", "NVIDIA", 5499, 360, 320, 16],
  ["RTX5090-32", "GeForce RTX 5090 32GB", "NVIDIA", 10999, 575, 350, 32],
  ["RX6600-8", "Radeon RX 6600 8GB", "AMD", 999, 132, 230, 8],
  ["RX6700XT-12", "Radeon RX 6700 XT 12GB", "AMD", 1599, 230, 280, 12],
  ["RX7600-8", "Radeon RX 7600 8GB", "AMD", 1299, 165, 240, 8],
  ["RX7700XT-12", "Radeon RX 7700 XT 12GB", "AMD", 1999, 245, 280, 12],
  ["RX7800XT-16", "Radeon RX 7800 XT 16GB", "AMD", 2399, 263, 300, 16],
  ["RX7900GRE-16", "Radeon RX 7900 GRE 16GB", "AMD", 2699, 260, 300, 16],
  ["RX7900XTX-24", "Radeon RX 7900 XTX 24GB", "AMD", 4299, 355, 330, 24],
  ["RX9070-16", "Radeon RX 9070 16GB", "AMD", 2899, 220, 290, 16],
  ["RX9070XT-16", "Radeon RX 9070 XT 16GB", "AMD", 3299, 304, 320, 16],
  ["ARC-A750-8", "Arc A750 8GB", "Intel", 899, 225, 270, 8],
  ["ARC-A770-16", "Arc A770 16GB", "Intel", 1199, 225, 270, 16],
  ["ARC-B580-12", "Arc B580 12GB", "Intel", 1399, 190, 270, 12]
].forEach(([sku, name, brand, myr, tdp, length, vram]) => {
  add("GPU-" + sku, name, "GPU", brand, myr, brand === "NVIDIA" ? 6 : 8, brand === "AMD" ? 8 : brand === "Intel" ? 200 : 130,
    vram + "GB card, about " + length + "mm long.", { tdpWatts: tdp, lengthMm: length, vramGb: vram });
});

[
  ["SAM-980-1", "990 EVO 1TB", "Samsung", 399, "NVMe", 1000],
  ["SAM-990-2", "990 Pro 2TB", "Samsung", 799, "NVMe", 2000],
  ["SAM-990-4", "990 Pro 4TB", "Samsung", 1499, "NVMe", 4000],
  ["SAM-870-1", "870 EVO 1TB", "Samsung", 349, "SATA", 1000],
  ["WD-SN850X-1", "Black SN850X 1TB", "Western Digital", 429, "NVMe", 1000],
  ["WD-SN850X-2", "Black SN850X 2TB", "Western Digital", 749, "NVMe", 2000],
  ["WD-SN770-1", "Black SN770 1TB", "Western Digital", 329, "NVMe", 1000],
  ["WD-SN580-2", "Blue SN580 2TB", "Western Digital", 499, "NVMe", 2000],
  ["CRU-P3P-2", "P3 Plus 2TB", "Crucial", 459, "NVMe", 2000],
  ["CRU-T500-2", "T500 2TB", "Crucial", 699, "NVMe", 2000],
  ["KST-NV2-1", "NV2 1TB", "Kingston", 249, "NVMe", 1000],
  ["KST-KC3000-2", "KC3000 2TB", "Kingston", 649, "NVMe", 2000],
  ["SEA-530R-2", "FireCuda 530R 2TB", "Seagate", 699, "NVMe", 2000],
  ["SEA-BARR-4", "BarraCuda 4TB", "Seagate", 399, "HDD", 4000],
  ["WD-BLUE-4", "Blue 4TB", "Western Digital", 379, "HDD", 4000],
  ["SKH-P41-2", "Platinum P41 2TB", "SK hynix", 629, "NVMe", 2000]
].forEach(([sku, name, brand, myr, storageType, capacityGb], index) => {
  add("SSD-" + sku, name, "STORAGE", brand, myr, 20 - (index % 8), 160 + index * 6, storageType + " drive, " + (capacityGb >= 1000 ? capacityGb / 1000 + "TB" : capacityGb + "GB") + ".", { storageType, capacityGb });
});

[
  ["COR-RM550", "RM550x 550W", "Corsair", 329, 550],
  ["COR-RM650", "RM650x 650W", "Corsair", 399, 650],
  ["COR-RM750", "RM750x 750W", "Corsair", 499, 750],
  ["COR-RM850", "RM850x 850W", "Corsair", 599, 850],
  ["COR-RM1000", "RM1000x 1000W", "Corsair", 799, 1000],
  ["COR-HX1200", "HX1200i 1200W", "Corsair", 1099, 1200],
  ["SEA-FOCUS-650", "Focus GX-650", "Seasonic", 449, 650],
  ["SEA-FOCUS-750", "Focus GX-750", "Seasonic", 549, 750],
  ["SEA-FOCUS-850", "Focus GX-850", "Seasonic", 649, 850],
  ["SEA-PRIME-1000", "Prime TX-1000", "Seasonic", 999, 1000],
  ["BQ-PURE-650", "Pure Power 12 M 650W", "be quiet!", 429, 650],
  ["BQ-PURE-750", "Pure Power 12 M 750W", "be quiet!", 499, 750],
  ["BQ-STRAIGHT-850", "Straight Power 12 850W", "be quiet!", 699, 850],
  ["CM-MWE-650", "MWE Gold 650 V2", "Cooler Master", 349, 650],
  ["CM-V850", "V850 SFX Gold", "Cooler Master", 699, 850],
  ["MSI-A750", "MAG A750GL", "MSI", 429, 750],
  ["MSI-A850", "MAG A850GL", "MSI", 499, 850],
  ["FSP-HYDRO-750", "Hydro G Pro 750W", "FSP", 459, 750]
].forEach(([sku, name, brand, myr, wattage], index) => {
  add("PSU-" + sku, name, "PSU", brand, myr, 10, 90 + index * 7, wattage + "W supply for a single-GPU desktop.", { wattage });
});

[
  ["LL-LANCOOL-216", "Lancool 216", "Lian Li", 449, "ATX", 420],
  ["LL-O11-AIR", "O11 Air Mini", "Lian Li", 599, "mATX", 362],
  ["LL-A4-H2O", "A4-H2O", "Lian Li", 699, "ITX", 322],
  ["NZXT-H5-FLOW", "H5 Flow", "NZXT", 429, "ATX", 365],
  ["NZXT-H7-FLOW", "H7 Flow", "NZXT", 599, "ATX", 400],
  ["NZXT-H1", "H1 V2", "NZXT", 999, "ITX", 305],
  ["FRAC-NORTH", "North", "Fractal", 649, "ATX", 355],
  ["FRAC-POP-AIR", "Pop Air", "Fractal", 399, "ATX", 380],
  ["FRAC-TERRA", "Terra", "Fractal", 799, "ITX", 322],
  ["FRAC-MESHIFY", "Meshify 2", "Fractal", 699, "ATX", 467],
  ["COR-4000D", "4000D Airflow", "Corsair", 449, "ATX", 360],
  ["COR-5000D", "5000D Airflow", "Corsair", 799, "ATX", 420],
  ["CM-NR200P", "NR200P", "Cooler Master", 499, "ITX", 330],
  ["CM-TD500", "TD500 Mesh", "Cooler Master", 429, "ATX", 390],
  ["PHANTEKS-G360A", "Eclipse G360A", "Phanteks", 399, "ATX", 400],
  ["PHANTEKS-XT-PRO", "XT Pro Ultra", "Phanteks", 499, "ATX", 410],
  ["SSUPD-MESHROOM", "Meshroom S", "SSUPD", 699, "ITX", 334],
  ["JONSBO-D31", "D31 Mesh", "Jonsbo", 459, "mATX", 335]
].forEach(([sku, name, brand, myr, formFactor, maxGpu], index) => {
  add("CASE-" + sku, name, "CASE", brand, myr, 7, 220 + index * 5, formFactor + " chassis, graphics cards up to " + maxGpu + "mm.", { formFactor, maxGpuLengthMm: maxGpu });
});

[
  ["NOCTUA-NHU12S", "NH-U12S chromax", "Noctua", 349, 160],
  ["NOCTUA-NHD15", "NH-D15", "Noctua", 499, 250],
  ["NOCTUA-NHL12S", "NH-L12S", "Noctua", 329, 140],
  ["THERM-PA120", "Peerless Assassin 120", "Thermalright", 179, 230],
  ["THERM-PS120", "Phantom Spirit 120", "Thermalright", 199, 250],
  ["ARCTIC-34", "Freezer 36", "Arctic", 159, 180],
  ["ARCTIC-LF3-240", "Liquid Freezer III 240", "Arctic", 399, 280],
  ["ARCTIC-LF3-360", "Liquid Freezer III 360", "Arctic", 499, 320],
  ["BQ-DARK4", "Dark Rock 4", "be quiet!", 329, 200],
  ["BQ-DARK-PRO5", "Dark Rock Pro 5", "be quiet!", 449, 270],
  ["BQ-PURE-LOOP-240", "Pure Loop 2 240", "be quiet!", 459, 260],
  ["COR-H100I", "iCUE H100i Elite", "Corsair", 549, 270],
  ["COR-H150I", "iCUE H150i Elite", "Corsair", 699, 320],
  ["NZXT-KRAKEN-240", "Kraken 240", "NZXT", 599, 280],
  ["DEEPCOOL-AK400", "AK400", "Deepcool", 129, 150],
  ["DEEPCOOL-AK620", "AK620", "Deepcool", 249, 260],
  ["CM-212-BLACK", "Hyper 212 Black", "Cooler Master", 149, 150],
  ["IDCOOL-SE224", "SE-224-XTS", "ID-COOLING", 99, 150]
].forEach(([sku, name, brand, myr, tdp], index) => {
  add("COOL-" + sku, name, "COOLING", brand, myr, 12, 80 + index * 8, "Fits AM4, AM5, LGA1700, and LGA1851. Rated around " + tdp + "W.", { sockets: ALL_SOCKETS, tdpWatts: tdp });
});

[
  ["ROG-STRIX-G16", "ROG Strix G16", "ASUS", 6999, "16 240Hz", "RTX 4070"],
  ["ROG-ZEPH-G14", "ROG Zephyrus G14", "ASUS", 7999, "14 120Hz OLED", "RTX 4060"],
  ["TUF-A15", "TUF Gaming A15", "ASUS", 4299, "15.6 144Hz", "RTX 4050"],
  ["TUF-F15", "TUF Gaming F15", "ASUS", 4999, "15.6 144Hz", "RTX 4060"],
  ["LEGION-5", "Legion 5 16", "Lenovo", 5499, "16 165Hz", "RTX 4060"],
  ["LEGION-PRO-7", "Legion Pro 7i", "Lenovo", 9999, "16 240Hz", "RTX 4080"],
  ["LOQ-15", "LOQ 15", "Lenovo", 3999, "15.6 144Hz", "RTX 4050"],
  ["KATANA-15", "Katana 15", "MSI", 4299, "15.6 144Hz", "RTX 4060"],
  ["RAIDER-18", "Raider 18 HX", "MSI", 12999, "18 120Hz", "RTX 4090"],
  ["STEALTH-16", "Stealth 16 Studio", "MSI", 8499, "16 240Hz", "RTX 4070"],
  ["NITRO-V", "Nitro V 15", "Acer", 3499, "15.6 144Hz", "RTX 4050"],
  ["PRED-HELIOS", "Predator Helios 16", "Acer", 7499, "16 165Hz", "RTX 4070"],
  ["OMEN-16", "Omen 16", "HP", 5999, "16.1 165Hz", "RTX 4060"],
  ["VICTUS-15", "Victus 15", "HP", 3299, "15.6 144Hz", "RTX 4050"],
  ["G15-5530", "G15 5530", "Dell", 4599, "15.6 165Hz", "RTX 4060"],
  ["ALIEN-M16", "Alienware m16 R2", "Dell", 8999, "16 240Hz", "RTX 4070"],
  ["BLADE-14", "Blade 14", "Razer", 10999, "14 240Hz", "RTX 4070"],
  ["BLADE-16", "Blade 16", "Razer", 13999, "16 240Hz OLED", "RTX 4080"],
  ["AORUS-15", "Aorus 15", "Gigabyte", 6499, "15.6 165Hz", "RTX 4060"],
  ["FRAMEWORK-13", "Framework Laptop 13", "Framework", 4999, "13.5 120Hz", "integrated"],
  ["MBA-13-M3", "MacBook Air 13", "Apple", 4999, "13.6 Liquid Retina", "integrated"],
  ["MBP-14-M4", "MacBook Pro 14", "Apple", 7999, "14.2 Liquid Retina XDR", "integrated"],
  ["XPS-14", "XPS 14", "Dell", 6999, "14.5 OLED", "RTX 4050"],
  ["SURFACE-LAP-7", "Surface Laptop 7", "Microsoft", 5499, "13.8 120Hz", "integrated"]
].forEach(([sku, name, brand, myr, screen, gpu]) => {
  add("LAP-" + sku, name, "LAPTOP", brand, myr, 4, 250, screen + " laptop, " + gpu + " graphics.", { screen, gpu });
});

[
  ["LG-27GP850", "27GP850-B", "LG", 1299, 27, "2560x1440", 180],
  ["LG-32GQ850", "32GQ850-B", "LG", 1999, 32, "2560x1440", 165],
  ["LG-34GP63", "34GP63A-B", "LG", 1799, 34, "3440x1440", 160],
  ["SAM-G5-27", "Odyssey G5 27", "Samsung", 999, 27, "2560x1440", 165],
  ["SAM-G6-27", "Odyssey G6 27", "Samsung", 1899, 27, "2560x1440", 240],
  ["SAM-G7-32", "Odyssey G7 32", "Samsung", 2299, 32, "2560x1440", 165],
  ["SAM-G9-49", "Odyssey G9 49", "Samsung", 4999, 49, "5120x1440", 240],
  ["ASUS-VG27AQ", "TUF VG27AQ", "ASUS", 1199, 27, "2560x1440", 165],
  ["ASUS-XG27AQ", "ROG Strix XG27AQ", "ASUS", 1699, 27, "2560x1440", 170],
  ["ASUS-PG27AQ", "ROG Swift PG27AQDM", "ASUS", 3299, 27, "2560x1440", 240],
  ["DELL-S2722", "S2722DGM", "Dell", 899, 27, "2560x1440", 165],
  ["DELL-AW2724", "Alienware AW2724DM", "Dell", 1599, 27, "2560x1440", 180],
  ["GB-M27Q", "M27Q", "Gigabyte", 1099, 27, "2560x1440", 170],
  ["GB-G27Q", "GS27Q", "Gigabyte", 999, 27, "2560x1440", 165],
  ["BENQ-XL2546", "XL2546K", "BenQ", 1899, 25, "1920x1080", 240],
  ["AOC-Q27G3", "Q27G3XMN", "AOC", 1499, 27, "2560x1440", 180]
].forEach(([sku, name, brand, myr, size, resolution, hz]) => {
  add("MON-" + sku, name, "MONITOR", brand, myr, 6, 60, size + "-inch " + resolution + " at " + hz + "Hz.", { sizeInches: size, resolution, refreshHz: hz });
});

[
  ["LOG-GPRO-X2", "G Pro X Superlight 2", "Logitech", 599, "mouse"],
  ["LOG-G502X", "G502 X Lightspeed", "Logitech", 499, "mouse"],
  ["LOG-G915", "G915 TKL", "Logitech", 799, "keyboard"],
  ["LOG-G733", "G733", "Logitech", 399, "headset"],
  ["RAZ-DEATHADDER", "DeathAdder V3", "Razer", 349, "mouse"],
  ["RAZ-VIPER-V3", "Viper V3 Pro", "Razer", 699, "mouse"],
  ["RAZ-HUNTSMAN", "Huntsman V3 Pro", "Razer", 899, "keyboard"],
  ["RAZ-BLACKSHARK", "BlackShark V2 Pro", "Razer", 599, "headset"],
  ["WOOT-80HE", "Wooting 80HE", "Wooting", 999, "keyboard"],
  ["KEYCHRON-Q1", "Q1 Max", "Keychron", 799, "keyboard"],
  ["KEYCHRON-K2", "K2 Pro", "Keychron", 399, "keyboard"],
  ["STEEL-APEX-PRO", "Apex Pro TKL", "SteelSeries", 799, "keyboard"],
  ["STEEL-ARCTIS", "Arctis Nova Pro", "SteelSeries", 1299, "headset"],
  ["HYPERX-CLOUD3", "Cloud III", "HyperX", 349, "headset"],
  ["HYPERX-ALLOY", "Alloy Origins", "HyperX", 399, "keyboard"],
  ["GLORIOUS-MODEL-O", "Model O 2", "Glorious", 299, "mouse"],
  ["ARTISAN-ZERO", "FX Zero XL", "Artisan", 249, "mousepad"],
  ["LOG-G640", "G640", "Logitech", 129, "mousepad"],
  ["ELGATO-4K", "4K X", "Elgato", 899, "capture"],
  ["FOCUSRITE-SOLO", "Scarlett Solo", "Focusrite", 499, "audio"]
].forEach(([sku, name, brand, myr, kind]) => {
  add("PER-" + sku, name, "PERIPHERAL", brand, myr, 15, 300, kind.charAt(0).toUpperCase() + kind.slice(1) + " from " + brand + ".", { kind });
});

const seen = new Set();
for (const item of items) {
  if (seen.has(item.sku)) throw new Error("Duplicate SKU " + item.sku);
  seen.add(item.sku);
}

function uuidFor(sku) {
  const digest = crypto.createHash("md5").update("apex:" + sku).digest();
  const bytes = Buffer.from(digest);
  bytes[6] = (bytes[6] & 0x0f) | 0x30;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

function sqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

const categories = [
  ["CPU", "Processors", true],
  ["MOTHERBOARD", "Motherboards", true],
  ["RAM", "Memory", true],
  ["GPU", "Graphics cards", true],
  ["STORAGE", "Storage", true],
  ["PSU", "Power supplies", true],
  ["CASE", "Cases", true],
  ["COOLING", "Cooling", true],
  ["LAPTOP", "Laptops", false],
  ["MONITOR", "Monitors", false],
  ["PERIPHERAL", "Peripherals", false]
];

const lines = [];
lines.push("-- Demo shelf catalog for apex_inventory. Prices are MYR cents, not a live retailer feed.");
lines.push("-- Safe to re-run: products update in place on sku.");
lines.push("BEGIN;");
lines.push("INSERT INTO categories (code, name, builder_slot) VALUES");
lines.push(categories.map(([code, name, slot]) => "  (" + sqlString(code) + ", " + sqlString(name) + ", " + slot + ")").join(",\n"));
lines.push("ON CONFLICT (code) DO NOTHING;");
lines.push("");
lines.push("INSERT INTO products (id, sku, name, category_code, brand, description, price_cents, stock, image_hue, specs, active) VALUES");
lines.push(items.map((item) => {
  return "  (" + sqlString(uuidFor(item.sku)) + ", " + sqlString(item.sku) + ", " + sqlString(item.name) + ", " + sqlString(item.category) + ", " + sqlString(item.brand) + ", " + sqlString(item.description) + ", " + item.priceCents + ", " + item.stock + ", " + item.hue + ", " + sqlString(JSON.stringify(item.specs)) + "::jsonb, TRUE)";
}).join(",\n"));
lines.push("ON CONFLICT (sku) DO UPDATE SET");
lines.push("  name = EXCLUDED.name,");
lines.push("  category_code = EXCLUDED.category_code,");
lines.push("  brand = EXCLUDED.brand,");
lines.push("  description = EXCLUDED.description,");
lines.push("  price_cents = EXCLUDED.price_cents,");
lines.push("  stock = EXCLUDED.stock,");
lines.push("  image_hue = EXCLUDED.image_hue,");
lines.push("  specs = EXCLUDED.specs,");
lines.push("  active = TRUE;");
lines.push("COMMIT;");
lines.push("");

const out = path.join(__dirname, "catalog.sql");
fs.writeFileSync(out, lines.join("\n"));
const counts = {};
for (const item of items) counts[item.category] = (counts[item.category] || 0) + 1;
console.log("Wrote " + items.length + " products to " + out);
console.log(JSON.stringify(counts));
