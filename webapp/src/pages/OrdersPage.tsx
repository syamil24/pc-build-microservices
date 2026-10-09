import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMyr } from "../api";
import type { Order } from "../types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Order[]>("/api/orders").then(setOrders).catch((ex: Error) => setError(ex.message));
  }, []);

  return (
    <section>
      <h1>Orders</h1>
      {error && <p className="error">{error}</p>}
      {orders.map((order) => (
        <Link key={order.id} to={`/orders/${order.id}`} className="panel" style={{ display: "block", marginBottom: 10 }}>
          <strong>{order.status}</strong>
          <div className="muted">{new Date(order.createdAt).toLocaleString()} · {order.lines.length} lines</div>
          <div className="price">{formatMyr(order.totalCents)}</div>
        </Link>
      ))}
    </section>
  );
}
