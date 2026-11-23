import { expect, test } from "@playwright/test";

const categories = [{ code: "GPU", name: "Graphics cards", builderSlot: true }];
const products = {
  items: [
    { id: "1", sku: "GPU-H70", name: "Helix H70 12GB", category: "GPU", brand: "Helix", description: "1440p", priceCents: 229900, stock: 4, imageHue: 140, specs: {}, active: true }
  ],
  page: 0,
  size: 20,
  total: 1
};

test("customers cannot open the admin panel", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("apex.access", "token");
    localStorage.setItem("apex.refresh", "refresh");
    localStorage.setItem("apex.email", "customer@apexbuild.local");
    localStorage.setItem("apex.role", "CUSTOMER");
  });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "BUILD THE RIG." })).toBeVisible();
});

test("admins manage products from the back office", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("apex.access", "token");
    localStorage.setItem("apex.refresh", "refresh");
    localStorage.setItem("apex.email", "admin@apexbuild.local");
    localStorage.setItem("apex.role", "ADMIN");
  });
  await page.route("**/api/catalog/categories", (route) => route.fulfill({ json: { success: true, data: categories } }));
  await page.route("**/api/catalog/admin/products**", (route) => route.fulfill({ json: { success: true, data: products } }));
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByText("Helix H70 12GB")).toBeVisible();
  await expect(page.getByRole("link", { name: "Live ops" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Live logs" })).toBeVisible();
});

test("admins watch live logs from the ops menu", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("apex.access", "token");
    localStorage.setItem("apex.refresh", "refresh");
    localStorage.setItem("apex.email", "admin@apexbuild.local");
    localStorage.setItem("apex.role", "ADMIN");
  });
  await page.route("**/api/platform/logs/files", (route) => route.fulfill({
    json: {
      success: true,
      data: [{ name: "gateway-service.log", sizeBytes: 1048576, lastModified: "2026-11-23T10:00:00Z" }]
    }
  }));
  const emitted = [
    "2026-11-23 10:00:00.123 INFO  [trace=] [span=] c.a.g.filter.GatewayAuthFilter - Allowed request",
    "2026-11-23 10:00:01.456 WARN  [trace=] [span=] c.a.g.filter.GatewayAuthFilter - Slow upstream",
    "2026-11-23 10:00:02.789 ERROR [trace=] [span=] c.a.g.filter.GatewayAuthFilter - Upstream failed"
  ].map((text) => `${text}\n`).join("");
  await page.route("**/api/platform/logs/tail**", (route) => {
    const offset = Number(new URL(route.request().url()).searchParams.get("offset"));
    route.fulfill({
      json: {
        success: true,
        data: {
          file: "gateway-service.log",
          lines: offset < 0 ? emitted.trim().split("\n") : [],
          nextOffset: emitted.length,
          sizeBytes: emitted.length,
          truncated: false,
          reset: false
        }
      }
    });
  });

  await page.goto("/admin/logs");
  await expect(page.getByRole("heading", { name: "Live logs" })).toBeVisible();
  await expect(page.getByRole("log", { name: "Live log output" })).toBeVisible();
  await expect(page.getByText("Allowed request")).toBeVisible();
  await expect(page.getByText("Slow upstream")).toBeVisible();
  await expect(page.getByText("Upstream failed")).toBeVisible();
  await expect(page.locator(".log-row.lvl-warn")).toBeVisible();
  await expect(page.locator(".log-row.lvl-error")).toBeVisible();
  await expect(page.getByText("3 of 3 lines")).toBeVisible();

  await page.getByLabel("Level").selectOption("ERROR");
  await expect(page.getByText("Allowed request")).toBeHidden();
  await expect(page.getByText("Upstream failed")).toBeVisible();
  await expect(page.getByText("1 of 3 lines")).toBeVisible();
});
