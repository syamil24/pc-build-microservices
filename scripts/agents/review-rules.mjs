import fs from "node:fs";

const diff = fs.readFileSync(process.argv[2], "utf8");
const findings = [];
const added = diff.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"));

for (const line of added) {
  if (/BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|CHIP_SECRET_KEY=\S+|DB_PASSWORD=.+|JWT_SECRET=\S+/.test(line)) {
    findings.push("A secret was added in the diff. Move it to .env.");
  }
  if (/\b(double|float)\b[^;\n]{0,40}(price|amount|total)/i.test(line)) {
    findings.push("Money must stay in integer cents. A floating-point price was added.");
  }
}

const serviceDb = {
  "auth-service": "apex_auth",
  "user-service": "apex_user",
  "inventory-service": "apex_inventory",
  "order-service": "apex_order",
  "payment-service": "apex_payment",
  "shipping-service": "apex_shipping",
  "report-service": "apex_report"
};
for (const [service, own] of Object.entries(serviceDb)) {
  if (!diff.includes(`services/${service}/`)) continue;
  for (const other of Object.values(serviceDb)) {
    if (other !== own && diff.includes(other) && diff.includes(`services/${service}/`)) {
      findings.push(`${service} mentions ${other}. A service reads only its own database.`);
    }
  }
}

const domainTouched = /services\/[a-z-]+\/src\/main\/java\/.*\/domain\//.test(diff);
const flywayTouched = /db\/migration\/V[0-9]+__.+\.sql/.test(diff);
if (domainTouched && !flywayTouched && /\b(Table|Column|Entity)\b/.test(diff)) {
  findings.push("A domain type changed and this diff has no Flyway file.");
}

const unique = [...new Set(findings)];
process.stdout.write(unique.join("\n"));
if (unique.length > 0) process.exitCode = 1;
