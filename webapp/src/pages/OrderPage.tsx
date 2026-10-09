import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatMyr } from "../api";
import type { Order, Shipment } from "../types";

export default function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Order>(`/api/orders/${id}`).then(setOrder).catch((ex: Error) => setError(ex.message));
    const timer = setInterval(() => {
      api<Shipment>(`/api/shipments/order/${id}`).then(setShipment).catch(() => setShipment(null));
    }, 4000);
    return () => clearInterval(timer);
  }, [id]);

  if (!order) return <p>{error || "Loading order..."}</p>;
  return (
    <section>
      <div className="kicker">{order.status}</div>
      <h1>{formatMyr(order.totalCents)}</h1>
      <p className="muted">{order.address}</p>
      <ul>{order.lines.map((line) => <li key={line.productId}>{line.name} × {line.quantity}</li>)}</ul>
      <h2>Shipping</h2>
      {shipment ? (
        <>
          <p>{shipment.carrier} · {shipment.trackingNumber}</p>
          <ol className="timeline">
            {shipment.events.map((event) => <li key={event.occurredAt + event.status}><strong>{event.status}</strong> — {event.message}</li>)}
          </ol>
        </>
      ) : <p className="muted">The courier has not picked this up yet. Paid orders start moving within a few seconds.</p>}
    </section>
  );
}
