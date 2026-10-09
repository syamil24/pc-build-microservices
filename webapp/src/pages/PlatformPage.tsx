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
    const load = () => api<Platform>("/api/platform/overview").then(setOverview).catch((ex: Error) => setError(ex.message));
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section>
      <h1>Service desk</h1>
      <p className="muted">Discovery polls Eureka, then reads health, CPU, heap, and disk from each instance.</p>
      {error && <p className="error">{error}</p>}
      {overview?.services.map((service) => (
        <article key={service.name} className="panel service">
          <h2>{service.name}</h2>
          {service.instances.map((instance) => (
            <div key={instance.instanceId} className="instance">
              <div>
                <strong className={instance.status === "UP" ? "up" : "down"}>{instance.status}</strong>
                <div className="muted">{instance.instanceId}</div>
              </div>
              <div>CPU {instance.cpuUsage == null ? "—" : `${Math.round(instance.cpuUsage * 100)}%`}</div>
              <div>Heap {mb(instance.heapUsedBytes)} / {mb(instance.heapMaxBytes)}</div>
              <div>Disk free {mb(instance.diskFreeBytes)}</div>
              <div>Up {instance.uptimeSeconds == null ? "—" : `${Math.round(instance.uptimeSeconds)}s`}</div>
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
