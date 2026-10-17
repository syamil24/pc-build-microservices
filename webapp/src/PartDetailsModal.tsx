import { useEffect } from "react";
import { formatMyr } from "./api";
import ProductPhoto from "./ProductPhoto";
import { specRows } from "./specs";
import type { Product } from "./types";

type Props = {
  product: Product;
  picked: boolean;
  onSelect: () => void;
  onClose: () => void;
};

export default function PartDetailsModal({ product, picked, onSelect, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={product.name}
           onClick={(event) => event.stopPropagation()}>
        <button className="modal-x" aria-label="Close" onClick={onClose}>×</button>
        <div className="modal-photo">
          <ProductPhoto product={product} label={product.sku} />
        </div>
        <div className="modal-info">
          <div className="kicker">{product.category}</div>
          <h2>{product.name}</h2>
          <p className="muted">{product.description}</p>
          <dl className="spec-table">
            {specRows(product).map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="modal-foot">
            <div>
              <div className="price">{formatMyr(product.priceCents)}</div>
              <div className="muted">{product.stock} in stock</div>
            </div>
            <button className="btn" onClick={() => { onSelect(); onClose(); }}>
              {picked ? "Keep this part" : "Select this part"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
