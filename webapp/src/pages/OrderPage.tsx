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
    let cancel = false;
    api<Order>(`/api/orders/${id}`).then((next) => {
      if (!cancel) setOrder(next);
    }).catch((ex: Error) => {
      if (!cancel) setError(ex.message);
    });

    const loadShipment = () => {
      if (document.hidden) return;
      api<Shipment>(`/api/shipments/order/${id}`).then((next) => {
        if (!cancel) setShipment(next);
      }).catch(() => {
        if (!cancel) setShipment(null);
      });
    };
    loadShipment();
    const timer = window.setInterval(loadShipment, 4000);
    const onVisible = () => { if (!document.hidden) loadShipment(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id]);

  useEffect(() => {
    if (order) document.title = `${order.status} order · Apex Build`;
  }, [order]);

  if (!order) return <p role={error ? "alert" : "status"}>{error ? `Error. ${error}` : "Loading order..."}</p>;
  return (
    <section>
      <p className="kicker">{order.status}</p>
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
