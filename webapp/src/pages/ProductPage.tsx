import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatMyr, session } from "../api";
import type { Product } from "../types";

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<Product>(`/api/catalog/products/${id}`).then(setProduct).catch((ex: Error) => setMessage(ex.message));
  }, [id]);

  async function add() {
    if (!session()) {
      setMessage("Log in to put this on the cart.");
      return;
    }
    try {
      await api("/api/cart/items", { method: "POST", body: JSON.stringify({ productId: id, quantity: 1, buildId: null }) });
      window.dispatchEvent(new Event("apex-cart"));
      setMessage("Added to cart.");
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Could not add");
    }
  }

  if (!product) return <p>{message || "Loading part..."}</p>;
  return (
    <article className="split" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 24 }}>
      <div className="swatch" style={{ minHeight: 280, background: `linear-gradient(160deg, hsl(${product.imageHue} 70% 40%), #0d1016)` }}>{product.sku}</div>
      <div>
        <div className="kicker">{product.category}</div>
        <h1>{product.name}</h1>
        <p className="muted">{product.description}</p>
        <p className="price">{formatMyr(product.priceCents)}</p>
        <ul>
          {Object.entries(product.specs).map(([key, value]) => (
            <li key={key}><strong>{key}</strong>: {Array.isArray(value) ? value.join(", ") : String(value)}</li>
          ))}
        </ul>
        <button className="btn" onClick={add}>Add to cart</button>
        {message && <p>{message}</p>}
      </div>
    </article>
  );
}
