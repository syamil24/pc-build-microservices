CREATE TABLE carts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name VARCHAR(160) NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    build_id UUID
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    status VARCHAR(40) NOT NULL,
    currency CHAR(3) NOT NULL,
    total_cents INTEGER NOT NULL,
    address_snapshot TEXT NOT NULL,
    payment_id UUID,
    checkout_url TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);

CREATE TABLE order_lines (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders (id),
    product_id UUID NOT NULL,
    product_name VARCHAR(160) NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    line_total_cents INTEGER NOT NULL,
    build_id UUID
);
