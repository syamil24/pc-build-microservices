import { useEffect, useRef } from "react";
import { formatMyr } from "./api";
import { closeTopLayer, supportsTopLayerExit } from "./dialog";
import ProductPhoto from "./ProductPhoto";
import { specRows } from "./specs";
import type { Product } from "./types";

type Props = {
  product: Product;
  picked: boolean;
  onSelect: () => void;
  onClose: () => void;
};

function outside(event: PointerEvent, dialog: HTMLDialogElement) {
  const rect = dialog.getBoundingClientRect();
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
}

export default function PartDetailsModal({ product, picked, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = `part-title-${product.id}`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.setAttribute("closedby", "any");

    let pressedOutside = false;
    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = outside(event, dialog);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (pressedOutside && outside(event, dialog)) void closeTopLayer(dialog);
    };
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
    }

    const onCancel = (event: Event) => {
      if (supportsTopLayerExit() || !event.cancelable) return;
      event.preventDefault();
      void closeTopLayer(dialog);
    };
    const onDialogClose = () => {
      const animations = dialog.getAnimations({ subtree: true });
      const done = animations.length
        ? Promise.race([
          Promise.allSettled(animations.map((animation) => animation.finished)),
          new Promise((resolve) => window.setTimeout(resolve, 400))
        ])
        : Promise.resolve();
      void done.then(() => onCloseRef.current());
    };

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onDialogClose);
    if (!dialog.open) dialog.showModal();

    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onDialogClose);
      if (dialog.open) dialog.close();
    };
  }, [product.id]);

  return (
    <dialog ref={ref} className="part-dialog" aria-labelledby={titleId}>
      <button type="button" className="modal-x" aria-label="Close" onClick={() => { if (ref.current) void closeTopLayer(ref.current); }}>×</button>
      <div className="modal-photo">
        <ProductPhoto product={product} label={product.sku} decorative />
      </div>
      <div className="modal-info">
        <p className="kicker">{product.category}</p>
        <h2 id={titleId}>{product.name}</h2>
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
            <p className="price">{formatMyr(product.priceCents)}</p>
            <p className="muted">{product.stock} in stock</p>
          </div>
          <button className="btn" type="button" autoFocus onClick={() => { onSelect(); if (ref.current) void closeTopLayer(ref.current); }}>
            {picked ? "Keep this part" : "Select this part"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
