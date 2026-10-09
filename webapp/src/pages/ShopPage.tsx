import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMyr } from "../api";
import type { Category, Page, Product } from "../types";

export default function ShopPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Category[]>("/api/catalog/categories").then(setCategories).catch((ex: Error) => setError(ex.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (minPrice) params.set("minPrice", String(Math.round(Number(minPrice) * 100)));
    if (maxPrice) params.set("maxPrice", String(Math.round(Number(maxPrice) * 100)));
    params.set("size", "24");
    api<Page<Product>>(`/api/catalog/products?${params}`).then(setProducts).catch((ex: Error) => setError(ex.message));
  }, [category, q, minPrice, maxPrice]);

  return (
    <section>
      <h1>Shop</h1>
      <p className="muted">Filter by category and price, or search the bench.</p>
      {error && <p className="error">{error}</p>}
      <div className="filters">
        <aside className="panel">
          <label>Search
            <input aria-label="Search products" value={q} onChange={(event) => setQ(event.target.value)} placeholder="GPU, laptop, keyboard" />
          </label>
          <label>Category
            <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All</option>
              {categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </label>
          <label>Min price (MYR)
            <input aria-label="Minimum price" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} inputMode="decimal" />
          </label>
          <label>Max price (MYR)
            <input aria-label="Maximum price" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} inputMode="decimal" />
          </label>
        </aside>
        <div className="grid">
          {products?.items.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`} className="panel card">
              <div className="swatch" style={{ background: `linear-gradient(145deg, hsl(${product.imageHue} 70% 42%), #101218)` }}>{product.category}</div>
              <div className="pill">{product.brand}</div>
              <h3>{product.name}</h3>
              <div className="price">{formatMyr(product.priceCents)}</div>
              <div className="muted">{product.stock} in stock</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
