import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMyr } from "../api";
import ProductPhoto from "../ProductPhoto";
import { specSummary } from "../specs";
import { useDebounced } from "../useDebounced";
import type { Category, Page, Product } from "../types";

function cents(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return String(Math.round(amount * 100));
}

export default function ShopPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState("");
  const query = useDebounced(q.trim(), 250);
  const min = useDebounced(minPrice, 250);
  const max = useDebounced(maxPrice, 250);

  useEffect(() => {
    const controller = new AbortController();
    api<Category[]>("/api/catalog/categories", { signal: controller.signal })
      .then(setCategories)
      .catch((ex: unknown) => {
        if (ex instanceof Error && ex.name === "AbortError") return;
        setError(ex instanceof Error ? ex.message : "Could not load categories");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (query) params.set("q", query);
      const minCents = cents(min);
      const maxCents = cents(max);
      if (minCents) params.set("minPrice", minCents);
      if (maxCents) params.set("maxPrice", maxCents);
      params.set("size", "24");
      api<Page<Product>>(`/api/catalog/products?${params}`, { signal: controller.signal })
        .then((page) => {
          setProducts(page);
          setError("");
        })
        .catch((ex: unknown) => {
          if (ex instanceof Error && ex.name === "AbortError") return;
          setError(ex instanceof Error ? ex.message : "Could not load products");
        });
    }, 0);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [category, query, min, max]);

  return (
    <section>
      <header className="page-head">
        <h1>Shop</h1>
        <p className="muted">Filter by category and price, or search the bench.</p>
      </header>
      {error && <p className="toast error" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
      <div className="filters">
        <aside className="panel" aria-label="Filters">
          <form role="search" onSubmit={(event) => event.preventDefault()}>
            <div className="field">
              <label htmlFor="shop-search">Search</label>
              <input id="shop-search" name="q" type="search" enterKeyHint="search" aria-label="Search products" value={q} onChange={(event) => setQ(event.target.value)} placeholder="GPU, laptop, keyboard" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="shop-category">Category</label>
              <select id="shop-category" name="category" aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All</option>
                {categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="min-price">Min price (MYR)</label>
              <input id="min-price" name="min-price" aria-label="Minimum price" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} inputMode="decimal" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="max-price">Max price (MYR)</label>
              <input id="max-price" name="max-price" aria-label="Maximum price" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} inputMode="decimal" autoComplete="off" />
            </div>
            <button className="ghost" type="button" onClick={() => { setCategory(""); setQ(""); setMinPrice(""); setMaxPrice(""); }}>Clear filters</button>
          </form>
        </aside>
        <div>
          {(products || !error) && (
            <p className="muted" aria-live="polite">{products ? `${products.total} products` : "Loading parts…"}</p>
          )}
          <div className="grid">
            {products?.items.map((product, index) => (
              <Link key={product.id} to={`/product/${product.id}`} className={index > 3 ? "deferred" : undefined} data-product-id={product.id}>
                <article className="panel card">
                  <ProductPhoto product={product} decorative eager={index === 0} />
                  <header>
                    <p className="pill">{product.brand}</p>
                    <h3>{product.name}</h3>
                  </header>
                  <p className="spec-line">{specSummary(product)}</p>
                  <footer>
                    <p className="price">{formatMyr(product.priceCents)}</p>
                    <p className="muted">{product.stock} in stock</p>
                  </footer>
                </article>
              </Link>
            ))}
          </div>
          {products && products.items.length === 0 && <p>No parts match these filters.</p>}
        </div>
      </div>
    </section>
  );
}
