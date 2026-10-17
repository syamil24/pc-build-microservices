import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import type { Category, Product } from "../../types";

function centsFromMyr(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

function myrFromCents(cents: number) {
  return `${Math.floor(cents / 100)}.${String(Math.abs(cents % 100)).padStart(2, "0")}`;
}

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("CPU");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [hue, setHue] = useState("140");
  const [specs, setSpecs] = useState("{}");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Category[]>("/api/catalog/categories").then(setCategories).catch((ex: Error) => setError(ex.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    api<Product>(`/api/catalog/admin/products/${id}`).then((product) => {
      setSku(product.sku);
      setName(product.name);
      setCategory(product.category);
      setBrand(product.brand);
      setDescription(product.description);
      setPrice(myrFromCents(product.priceCents));
      setStock(String(product.stock));
      setHue(String(product.imageHue));
      setSpecs(JSON.stringify(product.specs ?? {}, null, 2));
      setActive(product.active !== false);
    }).catch((ex: Error) => setError(ex.message));
  }, [id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    const priceCents = centsFromMyr(price);
    if (priceCents == null || priceCents <= 0) {
      setError("Enter a price in ringgit, such as 899.00");
      return;
    }
    let parsedSpecs: Record<string, unknown> = {};
    try {
      parsedSpecs = specs.trim() ? JSON.parse(specs) : {};
    } catch {
      setError("Specs must be JSON");
      return;
    }
    const body = {
      sku, name, category, brand, description, priceCents, stock: Number(stock),
      imageHue: Number(hue), specs: parsedSpecs, active
    };
    try {
      if (id) {
        await api(`/api/catalog/admin/products/${id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/api/catalog/admin/products", { method: "POST", body: JSON.stringify(body) });
      }
      navigate("/admin");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Could not save");
    }
  }

  return (
    <form className="panel form-grid" onSubmit={save}>
      <h2 className="wide">{id ? "Edit product" : "New product"}</h2>
      {error && <p className="error wide">{error}</p>}
      <label>SKU<input value={sku} onChange={(event) => setSku(event.target.value)} required /></label>
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>Category
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </label>
      <label>Brand<input value={brand} onChange={(event) => setBrand(event.target.value)} required /></label>
      <label>Price (MYR)<input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="899.00" required /></label>
      <label>Stock<input type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} required /></label>
      <label>Image hue<input type="number" min="0" max="359" value={hue} onChange={(event) => setHue(event.target.value)} /></label>
      <label>Active<input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></label>
      <label className="wide">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
      <label className="wide">Specs JSON<textarea value={specs} onChange={(event) => setSpecs(event.target.value)} /></label>
      <div className="row wide">
        <button className="btn" type="submit">Save</button>
        <Link to="/admin">Cancel</Link>
      </div>
    </form>
  );
}
