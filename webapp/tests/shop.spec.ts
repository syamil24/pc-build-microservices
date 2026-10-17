import { expect, test } from "@playwright/test";

const categories = [
  { code: "GPU", name: "Graphics cards", builderSlot: true },
  { code: "LAPTOP", name: "Laptops", builderSlot: false }
];

const products = {
  items: [
    { id: "1", sku: "GPU-H70", name: "Helix H70 12GB", category: "GPU", brand: "Helix", description: "1440p", priceCents: 229900, stock: 4, imageHue: 140, specs: {} },
    { id: "2", sku: "LAP-SLIM-14", name: "Lumina Slim 14", category: "LAPTOP", brand: "Lumina", description: "Thin", priceCents: 349900, stock: 2, imageHue: 50, specs: {} }
  ],
  page: 0,
  size: 24,
  total: 2
};

test("shop filters by category and search", async ({ page }) => {
  await page.route("**/api/catalog/categories", (route) => route.fulfill({ json: { success: true, data: categories } }));
  await page.route("**/api/catalog/products**", (route) => {
    const url = new URL(route.request().url());
    const category = url.searchParams.get("category");
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const items = products.items.filter((item) => (!category || item.category === category) && (!q || item.name.toLowerCase().includes(q)));
    return route.fulfill({ json: { success: true, data: { ...products, items, total: items.length } } });
  });

  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Helix H70 12GB" })).toBeVisible();
  await page.getByLabel("Category").selectOption("LAPTOP");
  await expect(page.getByRole("heading", { name: "Lumina Slim 14" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Helix H70 12GB" })).toHaveCount(0);
  await page.getByLabel("Category").selectOption("");
  await page.getByLabel("Search products").fill("helix");
  await expect(page.getByRole("heading", { name: "Helix H70 12GB" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lumina Slim 14" })).toHaveCount(0);
});

test("builder shows a live price", async ({ page }) => {
  await page.route("**/api/catalog/categories", (route) => route.fulfill({
    json: { success: true, data: [{ code: "CPU", name: "Processors", builderSlot: true }] }
  }));
  await page.route("**/api/catalog/products**", (route) => route.fulfill({
    json: {
      success: true,
      data: {
        items: [{ id: "cpu-1", sku: "CPU", name: "Voltedge V6 7600", category: "CPU", brand: "Voltedge", description: "", priceCents: 89900, stock: 3, imageHue: 90, specs: { socket: "AM5", tdpWatts: 65 } }],
        page: 0, size: 48, total: 1
      }
    }
  }));
  await page.route("**/api/catalog/builder/quote", (route) => route.fulfill({
    json: {
      success: true,
      data: {
        lines: [],
        totalCents: 89900,
        ok: true,
        issues: [],
        estimatedWatts: 145,
        psuWatts: null,
        recommendedPsuWatts: 182
      }
    }
  }));

  await page.goto("/builder");
  await page.getByRole("button", { name: /Voltedge V6 7600/ }).click();
  await expect(page.getByRole("complementary").getByText("RM 899.00")).toBeVisible();
});
