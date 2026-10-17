import { useState } from "react";
import type { Product } from "./types";

export default function ProductPhoto({ product, label }: { product: Pick<Product, "name" | "category" | "imageHue" | "imageUrl">; label?: string }) {
  const [failed, setFailed] = useState(false);
  const hue = product.imageHue ?? 140;
  const showImage = Boolean(product.imageUrl) && !failed;
  return (
    <div className="product-photo" style={{ background: `linear-gradient(145deg, hsl(${hue} 70% 42%), #101218)` }}>
      {showImage ? (
        <img src={product.imageUrl ?? undefined} alt={product.name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span>{label ?? product.category}</span>
      )}
    </div>
  );
}
