const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { items } = require("../catalog/emit-sql");

function uuidFor(key) {
  const digest = crypto.createHash("md5").update(key).digest();
  const bytes = Buffer.from(digest);
  bytes[6] = (bytes[6] & 0x0f) | 0x30;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

function sqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

const byCategory = new Map();
for (const item of items) {
  const list = byCategory.get(item.category) || [];
  list.push(item);
  byCategory.set(item.category, list);
}

const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
const sales = [];
let monthIndex = 0;
for (const month of months) {
  let categoryIndex = 0;
  for (const [category, products] of byCategory) {
    const picks = [products[monthIndex % products.length], products[(monthIndex + 3) % products.length]];
    let pickIndex = 0;
    for (const product of picks) {
      const quantity = 1 + ((monthIndex + categoryIndex + pickIndex) % 3);
      const day = String(1 + ((categoryIndex * 2 + pickIndex) % 27)).padStart(2, "0");
      const paidOn = month + "-" + day;
      const key = product.sku + ":" + month + ":" + pickIndex;
      sales.push({
        orderId: uuidFor("apex-order:" + key),
        lineId: uuidFor("apex-line:" + key),
        factId: uuidFor("apex-fact:" + key),
        productId: uuidFor("apex:" + product.sku),
        sku: product.sku,
        name: product.name,
        category,
        quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents: product.priceCents * quantity,
        paidOn
      });
      pickIndex += 1;
    }
    categoryIndex += 1;
  }
  monthIndex += 1;
}

const address = sqlString("Demo Customer, 1 Jalan Apex, Kuala Lumpur");
const orderRows = sales.map((sale) => {
  return "  (" + sqlString(sale.orderId) + ", :'customer_id'::uuid, 'FULFILLED', 'MYR', " + sale.lineTotalCents + ", " + address + ", NULL, NULL, " + sqlString(sale.paidOn + "T02:30:00Z") + "::timestamptz)";
});
const lineRows = sales.map((sale) => {
  return "  (" + sqlString(sale.lineId) + ", " + sqlString(sale.orderId) + "::uuid, " + sqlString(sale.productId) + "::uuid, " + sqlString(sale.name) + ", " + sale.unitPriceCents + ", " + sale.quantity + ", " + sale.lineTotalCents + ", NULL, " + sqlString(sale.sku) + ", " + sqlString(sale.category) + ")";
});
const factRows = sales.map((sale) => {
  return "  (" + sqlString(sale.factId) + "::uuid, " + sqlString(sale.orderId) + "::uuid, 1, " + sqlString(sale.paidOn) + "::date, " + sqlString(sale.category) + ", " + sqlString(sale.sku) + ", " + sqlString(sale.name) + ", " + sale.quantity + ", " + sale.unitPriceCents + ", " + sale.lineTotalCents + ")";
});

const orders = [];
orders.push("-- Demo fulfilled orders for apex_order. Pass the demo customer's id as the psql variable customer_id.");
orders.push("-- Safe to re-run: the same order and line ids update in place.");
orders.push("BEGIN;");
orders.push("INSERT INTO orders (id, user_id, status, currency, total_cents, address_snapshot, payment_id, checkout_url, created_at) VALUES");
orders.push(orderRows.join(",\n"));
orders.push("ON CONFLICT (id) DO UPDATE SET");
orders.push("  status = EXCLUDED.status,");
orders.push("  total_cents = EXCLUDED.total_cents,");
orders.push("  address_snapshot = EXCLUDED.address_snapshot,");
orders.push("  created_at = EXCLUDED.created_at;");
orders.push("");
orders.push("INSERT INTO order_lines (id, order_id, product_id, product_name, unit_price_cents, quantity, line_total_cents, build_id, sku, category_code) VALUES");
orders.push(lineRows.join(",\n"));
orders.push("ON CONFLICT (id) DO UPDATE SET");
orders.push("  product_name = EXCLUDED.product_name,");
orders.push("  unit_price_cents = EXCLUDED.unit_price_cents,");
orders.push("  quantity = EXCLUDED.quantity,");
orders.push("  line_total_cents = EXCLUDED.line_total_cents,");
orders.push("  sku = EXCLUDED.sku,");
orders.push("  category_code = EXCLUDED.category_code;");
orders.push("COMMIT;");
orders.push("");

const facts = [];
facts.push("-- Demo sales facts for apex_report. Prices are MYR cents. Safe to re-run.");
facts.push("BEGIN;");
facts.push("INSERT INTO sales_facts (id, order_id, line_no, paid_on, category_code, sku, product_name, quantity, unit_price_cents, line_total_cents) VALUES");
facts.push(factRows.join(",\n"));
facts.push("ON CONFLICT (order_id, line_no) DO UPDATE SET");
facts.push("  paid_on = EXCLUDED.paid_on,");
facts.push("  category_code = EXCLUDED.category_code,");
facts.push("  sku = EXCLUDED.sku,");
facts.push("  product_name = EXCLUDED.product_name,");
facts.push("  quantity = EXCLUDED.quantity,");
facts.push("  unit_price_cents = EXCLUDED.unit_price_cents,");
facts.push("  line_total_cents = EXCLUDED.line_total_cents;");
facts.push("COMMIT;");
facts.push("");

const dir = __dirname;
fs.writeFileSync(path.join(dir, "orders.sql"), orders.join("\n"));
fs.writeFileSync(path.join(dir, "sales.sql"), facts.join("\n"));
console.log("Wrote " + sales.length + " order lines and sales facts for " + months[0] + " through " + months[months.length - 1]);
