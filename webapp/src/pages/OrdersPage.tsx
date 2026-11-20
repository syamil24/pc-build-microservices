import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMyr } from "../api";
import type { Order } from "../types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<Order[]>("/api/orders", { signal: controller.signal })
      .then(setOrders)
      .catch((ex: unknown) => {
        if (ex instanceof Error && ex.name === "AbortError") return;
        setError(ex instanceof Error ? ex.message : "Could not load orders");
      });
    return () => controller.abort();
  }, []);

  return (
    <section>
      <header className="page-head">
        <h1>Orders</h1>
      </header>
      {error && <p className="toast error" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
      {orders.length === 0 && !error && <p>No orders yet. <Link to="/shop">Start in the shop</Link></p>}
      <ul className="order-list">
        {orders.map((order) => (
          <li key={order.id}>
            <Link to={`/orders/${order.id}`} className="panel cart-line">
              <span>
                <strong>{order.status}</strong>
                <span className="muted">{new Date(order.createdAt).toLocaleString()} · {order.lines.length} lines</span>
              </span>
              <span className="price">{formatMyr(order.totalCents)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
