CREATE TABLE shipments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    tracking_number VARCHAR(40) NOT NULL UNIQUE,
    status VARCHAR(40) NOT NULL,
    carrier_name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE shipment_events (
    id UUID PRIMARY KEY,
    shipment_id UUID NOT NULL REFERENCES shipments (id),
    status VARCHAR(40) NOT NULL,
    message VARCHAR(200) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL
);
