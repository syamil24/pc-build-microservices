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
      {error && <p className="toast error wide" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
      <div className="field">
        <label htmlFor="sku">SKU</label>
        <input id="sku" name="sku" value={sku} onChange={(event) => setSku(event.target.value)} required autoComplete="off" spellCheck={false} aria-invalid="false" data-error="sku-error" />
        <p id="sku-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a SKU.</p>
      </div>
      <div className="field">
        <label htmlFor="product-name">Name</label>
        <input id="product-name" name="name" value={name} onChange={(event) => setName(event.target.value)} required aria-invalid="false" data-error="name-error" />
        <p id="name-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter the product name.</p>
      </div>
      <div className="field">
        <label htmlFor="product-category">Category</label>
        <select id="product-category" name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="brand">Brand</label>
        <input id="brand" name="brand" value={brand} onChange={(event) => setBrand(event.target.value)} required aria-invalid="false" data-error="brand-error" />
        <p id="brand-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a brand.</p>
      </div>
      <div className="field">
        <label htmlFor="price">Price (MYR)</label>
        <span id="price-hint" className="hint">Use ringgit and sen, such as 899.00.</span>
        <input id="price" name="price" inputMode="decimal" autoComplete="off" placeholder="899.00" value={price} onChange={(event) => setPrice(event.target.value)} required pattern={"^\\d+(\\.\\d{0,2})?$"} aria-invalid="false" aria-describedby="price-hint" data-error="price-error" />
        <p id="price-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a price in ringgit, such as 899.00.</p>
      </div>
      <div className="field">
        <label htmlFor="stock">Stock</label>
        <input id="stock" name="stock" type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} required aria-invalid="false" data-error="stock-error" />
        <p id="stock-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a stock count of zero or more.</p>
      </div>
      <div className="field">
        <label htmlFor="hue">Image hue</label>
        <input id="hue" name="hue" type="number" min="0" max="359" value={hue} onChange={(event) => setHue(event.target.value)} />
      </div>
      <label className="check">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
        Active
      </label>
      <div className="field wide">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} required aria-invalid="false" data-error="description-error" />
        <p id="description-error" className="error-msg"><span role="img" aria-label="Error">!</span> Enter a description.</p>
      </div>
      <div className="field wide">
        <label htmlFor="specs">Specs JSON</label>
        <textarea id="specs" name="specs" value={specs} onChange={(event) => setSpecs(event.target.value)} spellCheck={false} />
      </div>
      <div className="row wide">
        <button className="btn" type="submit">Save</button>
        <Link to="/admin">Cancel</Link>
      </div>
    </form>
  );
}
