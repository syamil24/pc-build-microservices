import { useState } from "react";
import { productTransitionName } from "./transition";
import type { Product } from "./types";

type Props = {
  product: Pick<Product, "id" | "name" | "category" | "imageHue" | "imageUrl">;
  label?: string;
  priority?: boolean;
  eager?: boolean;
  decorative?: boolean;
  named?: boolean;
};

export default function ProductPhoto({ product, label, priority = false, eager = false, decorative = false, named = false }: Props) {
  const [failed, setFailed] = useState(false);
  const hue = product.imageHue ?? 140;
  const showImage = Boolean(product.imageUrl) && !failed;
  return (
    <div
      className="product-photo"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 70% 42%), #101218)`,
        viewTransitionName: named && product.id ? productTransitionName(product.id) : undefined
      }}
    >
      {showImage ? (
        <img
          src={product.imageUrl ?? undefined}
          alt={decorative ? "" : product.name}
          width={640}
          height={480}
          decoding="async"
          {...(priority
            ? { fetchPriority: "high" as const }
            : eager
              ? {}
              : { loading: "lazy" as const })}
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{label ?? product.category}</span>
      )}
    </div>
  );
}
