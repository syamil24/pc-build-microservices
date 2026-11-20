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
      setError("");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Cart failed");
    }
  }

  useEffect(() => { void load(); }, []);

  async function remove(id: string) {
    try {
      await api(`/api/cart/items/${id}`, { method: "DELETE" });
      window.dispatchEvent(new Event("apex-cart"));
      await load();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Could not remove that line");
    }
  }

  return (
    <section>
      <header className="page-head">
        <h1>Cart</h1>
      </header>
      {error && <p className="toast error" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
      {cart && cart.lines.length === 0 && !error && <p>Your cart is empty. <Link to="/shop">Browse the shop</Link></p>}
      <ul className="cart-list">
        {cart?.lines.map((line) => (
          <li key={line.id} className="panel cart-line">
            <div>
              <strong>{line.name}</strong>
              <div className="muted">Qty {line.quantity}{line.buildId ? " · part of a build" : ""}</div>
            </div>
            <div className="row">
              <span className="price">{formatMyr(line.lineTotalCents)}</span>
              <button className="ghost" type="button" onClick={() => remove(line.id)}>Remove <span className="visually-hidden">{line.name}</span></button>
            </div>
          </li>
        ))}
      </ul>
      <h2>Total {formatMyr(cart?.totalCents ?? 0)}</h2>
      <Link to="/checkout" className="btn">Checkout</Link>
    </section>
  );
}
