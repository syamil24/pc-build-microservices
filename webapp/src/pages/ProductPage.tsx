import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatMyr, session } from "../api";
import ProductPhoto from "../ProductPhoto";
import { specRows } from "../specs";
import type { Product } from "../types";

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setMessage("");
    setAdded(false);
    api<Product>(`/api/catalog/products/${id}`, { signal: controller.signal })
      .then(setProduct)
      .catch((ex: unknown) => {
        if (ex instanceof Error && ex.name === "AbortError") return;
        setMessage(ex instanceof Error ? ex.message : "Could not load this part");
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (product) document.title = `${product.name} · Apex Build`;
  }, [product]);

  async function add() {
    if (!session()) {
      setAdded(false);
      setMessage("Log in to put this on the cart.");
      return;
    }
    try {
      await api("/api/cart/items", { method: "POST", body: JSON.stringify({ productId: id, quantity: 1, buildId: null }) });
      window.dispatchEvent(new Event("apex-cart"));
      setAdded(true);
      setMessage("Added to cart.");
    } catch (ex) {
      setAdded(false);
      setMessage(ex instanceof Error ? ex.message : "Could not add");
    }
  }

  if (!product) {
    return <p role={message ? "alert" : "status"}>{message ? `Error. ${message}` : "Loading part..."}</p>;
  }

  return (
    <article>
      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/shop">Shop</Link></li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>
      <div className="product-layout">
        <ProductPhoto product={product} label={product.sku} priority named />
        <div>
          <p className="kicker">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <p className="price">{formatMyr(product.priceCents)}</p>
          <dl className="spec-table">
            {specRows(product).map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
          <button className="btn" type="button" onClick={add}>Add to cart</button>
          {message && (
            <p className={added ? "toast ok" : "toast error"} role={added ? "status" : "alert"}>
              <span role="img" aria-label={added ? "Success" : "Error"}>{added ? "✓" : "!"}</span>
              <span>{message} {added && <Link to="/cart">Review the cart</Link>}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
