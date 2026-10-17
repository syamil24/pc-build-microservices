import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMyr } from "../../api";
import type { Category, Page, Product } from "../../types";

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [error, setError] = useState("");

  function load() {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    params.set("includeInactive", String(includeInactive));
    params.set("size", "20");
    api<Page<Product>>(`/api/catalog/admin/products?${params}`)
      .then(setProducts)
      .catch((ex: Error) => setError(ex.message));
  }

  useEffect(() => {
    api<Category[]>("/api/catalog/categories").then(setCategories).catch((ex: Error) => setError(ex.message));
  }, []);

  useEffect(() => {
    load();
  }, [category, q, includeInactive]);

  async function deactivate(product: Product) {
    if (!window.confirm(`Deactivate ${product.name}? It leaves the shop but stays in old orders.`)) return;
    try {
      await api(`/api/catalog/admin/products/${product.id}`, { method: "DELETE" });
      load();
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
      {error && <p className="error">{error}</p>}
      <div className="row">
        <label>Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All</option>
            {categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
        <label>Search
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, brand, or SKU" />
        </label>
        <label>Inactive
          <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
        </label>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {products?.items.map((product) => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>{formatMyr(product.priceCents)}</td>
                <td>{product.stock}</td>
                <td>{product.active === false ? "Inactive" : "Active"}</td>
                <td className="row">
                  <Link to={`/admin/products/${product.id}`}>Edit</Link>
                  {product.active !== false && <button className="ghost" onClick={() => deactivate(product)}>Deactivate</button>}
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
