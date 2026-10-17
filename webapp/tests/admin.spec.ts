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
  await expect(page.getByRole("link", { name: "Sales report" })).toBeVisible();
});
