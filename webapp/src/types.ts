export type Category = { code: string; name: string; builderSlot: boolean };

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  priceCents: number;
  stock: number;
  imageHue: number;
  specs: Record<string, unknown>;
};

export type Page<T> = { items: T[]; page: number; size: number; total: number };

export type Issue = { severity: "ERROR" | "WARN"; message: string };

export type Quote = {
  lines: Array<{
    productId: string;
    name: string;
    category: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
    imageHue: number;
  }>;
  totalCents: number;
  ok: boolean;
  issues: Issue[];
  estimatedWatts: number;
  psuWatts: number | null;
  recommendedPsuWatts: number;
};

export type Cart = {
  id: string | null;
  lines: Array<{
    id: string;
    productId: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
    buildId: string | null;
    lineTotalCents: number;
  }>;
  totalCents: number;
};

export type Order = {
  id: string;
  status: string;
  currency: string;
  totalCents: number;
  address: string;
  checkoutUrl: string | null;
  paymentId: string | null;
  createdAt: string;
  lines: Array<{ productId: string; name: string; unitPriceCents: number; quantity: number; lineTotalCents: number }>;
};

export type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  snapshot: string;
};

export type Profile = { id: string; email: string; fullName: string; phone: string | null };

export type Shipment = {
  trackingNumber: string;
  status: string;
  carrier: string;
  events: Array<{ status: string; message: string; occurredAt: string }>;
};

export type Platform = {
  generatedAt: string;
  services: Array<{
    name: string;
    instances: Array<{
      instanceId: string;
      status: string;
      uri: string;
      cpuUsage: number | null;
      heapUsedBytes: number | null;
      heapMaxBytes: number | null;
      diskFreeBytes: number | null;
      uptimeSeconds: number | null;
    }>;
  }>;
};

export type Session = { accessToken: string; refreshToken: string; email: string; role: string };
