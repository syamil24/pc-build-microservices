import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatMyr, session } from "../api";
import ProductPhoto from "../ProductPhoto";
import { specSummary } from "../specs";
import RigCase from "../RigCase";
import PartDetailsModal from "../PartDetailsModal";
import SlotIcon from "../SlotIcon";
import type { Category, Page, Product, Quote } from "../types";

const SLOT_ORDER = ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLING"];
const BUILD_KEY = "apex.build";

export default function BuilderPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState("CPU");
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Record<string, Product | undefined>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<Product | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api<Category[]>("/api/catalog/categories")
      .then((rows) => setCategories(rows.filter((row) => row.builderSlot)))
      .catch((ex: Error) => setMessage(ex.message));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<Page<Product>>(`/api/catalog/products?category=${active}&size=48`)
      .then((page) => { if (alive) setCatalog(page.items); })
      .catch((ex: Error) => { if (alive) setMessage(ex.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [active]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUILD_KEY);
      if (!raw) return;
      const ids = JSON.parse(raw) as Record<string, string>;
      const entries = Object.entries(ids).filter(([, id]) => Boolean(id));
      if (entries.length === 0) return;
      Promise.all(entries.map(([code, id]) =>
        api<Product>(`/api/catalog/products/${id}`)
          .then((product) => ({ code, product }))
          .catch(() => null)
      )).then((rows) => {
        const restored: Record<string, Product> = {};
        for (const row of rows) {
          if (row && SLOT_ORDER.includes(row.code)) restored[row.code] = row.product;
        }
        if (Object.keys(restored).length > 0) setPicked(restored);
      });
    } catch {
      /* a broken saved build just starts empty */
    }
  }, []);

  useEffect(() => {
    const ids: Record<string, string> = {};
    for (const [code, product] of Object.entries(picked)) {
      if (product) ids[code] = product.id;
    }
    localStorage.setItem(BUILD_KEY, JSON.stringify(ids));
    setAdded(false);
  }, [picked]);

  const lines = useMemo(
    () => Object.values(picked).flatMap((product) => product ? [{ productId: product.id, quantity: 1 }] : []),
    [picked]
  );

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const handle = setTimeout(() => {
      api<Quote>("/api/catalog/builder/quote", { method: "POST", body: JSON.stringify({ lines }) })
        .then(setQuote)
        .catch((ex: Error) => setMessage(ex.message));
    }, 250);
    return () => clearTimeout(handle);
  }, [lines]);

  const nameOf = (code: string) => categories.find((item) => item.code === code)?.name || code;
  const slots = SLOT_ORDER.map((code) => ({ code, name: nameOf(code) }));
  const pickedCount = SLOT_ORDER.filter((code) => picked[code]).length;
  const progress = Math.round((pickedCount / SLOT_ORDER.length) * 100);
  const load = quote?.psuWatts ? Math.min(100, Math.round((quote.estimatedWatts / quote.psuWatts) * 100)) : quote ? 40 : 0;

  function select(product: Product) {
    setPicked((current) => ({ ...current, [active]: product }));
    setMessage("");
  }

  function remove(code: string) {
    setPicked((current) => ({ ...current, [code]: undefined }));
  }

  function clearBuild() {
    setPicked({});
    setMessage("");
  }

  async function addBuild() {
    if (!session()) {
      setMessage("Log in before sending the build to the cart.");
      return;
    }
    if (!quote?.ok) {
      setMessage("Resolve the compatibility errors first.");
      return;
    }
    try {
      await api("/api/cart/builds", {
        method: "POST",
        body: JSON.stringify({ buildId: crypto.randomUUID(), lines })
      });
      window.dispatchEvent(new Event("apex-cart"));
      setAdded(true);
      setMessage("");
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Could not add the build");
    }
  }

  return (
    <section className="builder-page">
      <div className="builder-head">
        <div>
          <h1>PC builder</h1>
          <p className="muted">Pick a slot on the rig or on the list. Apex checks sockets, memory, clearance, and power as you go.</p>
        </div>
        <div className="build-progress" aria-label={`${pickedCount} of ${SLOT_ORDER.length} parts picked`}>
          <div className="row">
            <strong>{pickedCount} / {SLOT_ORDER.length}</strong>
            <span className="muted">parts picked</span>
          </div>
          <div className="bar"><span style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      {message && <p className="toast error" role="alert">{message}</p>}
      {added && (
        <p className="toast ok" role="status">
          Build added to the cart. <Link to="/cart">Review the cart</Link>
        </p>
      )}

      <div className="builder">
        <nav className="slots" aria-label="Build slots">
          {SLOT_ORDER.map((code) => {
            const product = picked[code];
            const cls = "slot" + (code === active ? " on" : "") + (product ? " filled" : "");
            return (
              <button key={code} className={cls} onClick={() => setActive(code)} aria-pressed={code === active}>
                <SlotIcon code={code} />
                <span className="slot-text">
                  <strong>{nameOf(code)}</strong>
                  <span className="slot-pick">{product ? product.name : "Empty slot"}</span>
                </span>
                <span className="slot-state" aria-hidden="true">{product ? "✓" : "+"}</span>
              </button>
            );
          })}
        </nav>

        <div className="stage">
          <RigCase slots={slots} picked={picked} active={active} onSelect={setActive} />

          <div className="parts-head">
            <h2>{nameOf(active)}</h2>
            <span className="muted">{loading ? "Loading..." : `${catalog.length} options`}</span>
          </div>
          <div className="parts">
            {!loading && catalog.length === 0 && <p className="muted">No parts in this slot yet.</p>}
            {catalog.map((product) => {
              const isPicked = picked[active]?.id === product.id;
              return (
                <article key={product.id} className={"part" + (isPicked ? " picked" : "")}>
                  <button className="part-main" aria-pressed={isPicked} onClick={() => select(product)}>
                    <ProductPhoto product={product} />
                    <span className="part-body">
                      {product.brand && !product.name.toLowerCase().startsWith(product.brand.toLowerCase()) && (
                        <span className="pill">{product.brand}</span>
                      )}
                      <span className="part-name">{product.name}</span>
                      <span className="spec-line">{specSummary(product)}</span>
                      <span className="part-foot">
                        <span className="price">{formatMyr(product.priceCents)}</span>
                        <span className="muted">{product.stock} in stock</span>
                      </span>
                    </span>
                    <span className="part-check" aria-hidden="true">✓</span>
                  </button>
                  <button className="part-specs" aria-label="Full specifications" onClick={() => setDetail(product)}>
                    Specs
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="panel summary">
          <div className="kicker">Your build</div>
          <ul className="build-list">
            {SLOT_ORDER.map((code) => {
              const product = picked[code];
              if (!product) {
                return (
                  <li key={code}>
                    <button className="build-empty" onClick={() => setActive(code)}>
                      <span>+</span> {nameOf(code)}
                    </button>
                  </li>
                );
              }
              return (
                <li key={code} className="build-item">
                  <span className="build-thumb"><ProductPhoto product={product} /></span>
                  <span className="build-meta">
                    <strong>{product.name}</strong>
                    <span className="muted">{nameOf(code)}</span>
                  </span>
                  <span className="price">{formatMyr(product.priceCents)}</span>
                  <button className="build-remove" aria-label={`Remove ${product.name}`} onClick={() => remove(code)}>×</button>
                </li>
              );
            })}
          </ul>

          <div className="meter">
            <div className="row">
              <span className="muted">Draw {quote?.estimatedWatts ?? 0}W</span>
              <span className="muted">PSU {quote?.psuWatts ?? "-"}W</span>
            </div>
            <div className={"bar" + (load > 85 ? " hot" : "")}><span style={{ width: `${load}%` }} /></div>
            <div className="muted">Suggested PSU {quote?.recommendedPsuWatts ?? 0}W</div>
          </div>

          <ul className="build-issues">
            {quote?.issues.map((issue) => (
              <li key={issue.message} className={issue.severity === "ERROR" ? "error" : "warn"}>{issue.message}</li>
            ))}
            {quote?.ok && <li className="ok">Parts agree with each other.</li>}
          </ul>

          <div className="summary-total">
            <span>Total</span>
            <span className="price">{formatMyr(quote?.totalCents ?? 0)}</span>
          </div>
          <button className="btn" disabled={!quote?.ok} onClick={addBuild}>Add build to cart</button>
          {pickedCount > 0 && <button className="ghost" onClick={clearBuild}>Clear build</button>}
        </aside>
      </div>

      {detail && (
        <PartDetailsModal
          product={detail}
          picked={picked[active]?.id === detail.id}
          onSelect={() => select(detail)}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}
