import { useEffect, useState } from "react";
import { api } from "../api";
import type { Platform } from "../types";

function mb(bytes: number | null) {
  if (bytes == null) return "—";
  return `${Math.round(bytes / 1048576)} MB`;
}

export default function PlatformPage() {
  const [overview, setOverview] = useState<Platform | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    const load = () => {
      if (document.hidden) return;
      api<Platform>("/api/platform/overview").then((next) => {
        if (!cancel) setOverview(next);
      }).catch((ex: Error) => {
        if (!cancel) setError(ex.message);
      });
    };
    load();
    const timer = window.setInterval(load, 5000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <section>
      <header className="page-head">
        <h1>Service desk</h1>
        <p className="muted">Discovery polls Eureka, then reads health, CPU, heap, and disk from each instance.</p>
      </header>
      {error && <p className="toast error" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
      {overview?.services.map((service) => (
        <article key={service.name} className="panel service">
          <h2>{service.name}</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={`${service.name} instances`}>
            <table className="data">
              <caption className="visually-hidden">{service.name} instances</caption>
              <thead>
                <tr>
                  <th scope="col">Instance</th>
                  <th scope="col">CPU</th>
                  <th scope="col">Heap</th>
                  <th scope="col">Disk free</th>
                  <th scope="col">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {service.instances.map((instance) => (
                  <tr key={instance.instanceId}>
                    <th scope="row">
                      <span className={instance.status === "UP" ? "up" : "down"}>{instance.status}</span>
                      <div className="muted">{instance.instanceId}</div>
                    </th>
                    <td data-label="CPU">{instance.cpuUsage == null ? "—" : `${Math.round(instance.cpuUsage * 100)}%`}</td>
                    <td data-label="Heap">{mb(instance.heapUsedBytes)} / {mb(instance.heapMaxBytes)}</td>
                    <td data-label="Disk free">{mb(instance.diskFreeBytes)}</td>
                    <td data-label="Uptime">{instance.uptimeSeconds == null ? "—" : `${Math.round(instance.uptimeSeconds)}s`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </section>
  );
}
