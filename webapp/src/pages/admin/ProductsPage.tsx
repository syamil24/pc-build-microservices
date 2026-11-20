import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMyr } from "../../api";
import { useDebounced } from "../../useDebounced";
import type { Category, Page, Product } from "../../types";

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [error, setError] = useState("");
  const query = useDebounced(q.trim(), 250);

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
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query) params.set("q", query);
    params.set("includeInactive", String(includeInactive));
    params.set("size", "20");
    api<Page<Product>>(`/api/catalog/admin/products?${params}`, { signal: controller.signal })
      .then(setProducts)
      .catch((ex: unknown) => {
        if (ex instanceof Error && ex.name === "AbortError") return;
        setError(ex instanceof Error ? ex.message : "Could not load products");
      });
    return () => controller.abort();
  }, [category, query, includeInactive]);

  async function deactivate(product: Product) {
    if (!window.confirm(`Deactivate ${product.name}? It leaves the shop but stays in old orders.`)) return;
    try {
      await api(`/api/catalog/admin/products/${product.id}`, { method: "DELETE" });
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (query) params.set("q", query);
      params.set("includeInactive", String(includeInactive));
      params.set("size", "20");
      setProducts(await api<Page<Product>>(`/api/catalog/admin/products?${params}`));
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Could not deactivate");
    }
  }

  return (
    <section className="panel">
      <div className="row">
        <h2>Products</h2>
        <div className="spacer" />
        <Link to="/admin/products/new" className="btn">New product</Link>
      </div>
      {error && <p className="toast error" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
      <div className="row">
        <div className="field">
          <label htmlFor="admin-category">Category</label>
          <select id="admin-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All</option>
            {categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="admin-search">Search</label>
          <input id="admin-search" type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, brand, or SKU" autoComplete="off" />
        </div>
        <label className="check">
          <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
          Include inactive
        </label>
      </div>
      <div className="table-wrap" tabIndex={0} role="region" aria-labelledby="products-caption">
        <table className="data">
          <caption id="products-caption">Catalog products</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">SKU</th>
              <th scope="col">Category</th>
              <th scope="col">Price</th>
              <th scope="col">Stock</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products?.items.map((product) => (
              <tr key={product.id}>
                <th scope="row">{product.name}</th>
                <td data-label="SKU">{product.sku}</td>
                <td data-label="Category">{product.category}</td>
                <td data-label="Price">{formatMyr(product.priceCents)}</td>
                <td data-label="Stock">{product.stock}</td>
                <td data-label="Status">{product.active === false ? "Inactive" : "Active"}</td>
                <td data-label="Actions" className="row">
                  <Link to={`/admin/products/${product.id}`}>Edit</Link>
                  {product.active !== false && <button className="ghost" type="button" onClick={() => deactivate(product)}>Deactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products && <p className="muted">{products.total} products</p>}
    </section>
  );
}
