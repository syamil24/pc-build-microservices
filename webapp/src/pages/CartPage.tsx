import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMyr, session } from "../api";
import type { Cart } from "../types";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState("");

  async function load() {
    if (!session()) {
      setError("Log in to see the cart.");
      return;
    }
    try {
      setCart(await api<Cart>("/api/cart"));
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Cart failed");
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await api(`/api/cart/items/${id}`, { method: "DELETE" });
    window.dispatchEvent(new Event("apex-cart"));
    await load();
  }

  return (
    <section>
      <h1>Cart</h1>
      {error && <p className="error">{error}</p>}
      {cart?.lines.map((line) => (
        <div key={line.id} className="panel row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <strong>{line.name}</strong>
            <div className="muted">Qty {line.quantity}{line.buildId ? " · part of a build" : ""}</div>
          </div>
          <div className="row">
            <span className="price">{formatMyr(line.lineTotalCents)}</span>
            <button className="ghost" onClick={() => remove(line.id)}>Remove</button>
          </div>
        </div>
      ))}
      <h2>Total {formatMyr(cart?.totalCents ?? 0)}</h2>
      <Link to="/checkout" className="btn">Checkout</Link>
    </section>
  );
}
