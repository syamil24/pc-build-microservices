CREATE TABLE sales_facts (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    line_no INTEGER NOT NULL,
    paid_on DATE NOT NULL,
    category_code VARCHAR(40) NOT NULL,
    sku VARCHAR(40) NOT NULL,
    product_name VARCHAR(160) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
    line_total_cents INTEGER NOT NULL CHECK (line_total_cents > 0),
    UNIQUE (order_id, line_no)
);

CREATE INDEX sales_facts_paid_idx ON sales_facts (paid_on, category_code);
