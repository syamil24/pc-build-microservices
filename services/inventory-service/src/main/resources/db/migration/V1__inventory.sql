CREATE TABLE categories (
    code VARCHAR(40) PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    builder_slot BOOLEAN NOT NULL
);

CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    category_code VARCHAR(40) NOT NULL REFERENCES categories (code),
    brand VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    image_hue INTEGER NOT NULL,
    specs JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX products_category_idx ON products (category_code);
CREATE INDEX products_name_idx ON products (lower(name));

CREATE TABLE reservations (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE reservation_lines (
    id UUID PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations (id),
    product_id UUID NOT NULL REFERENCES products (id),
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);
