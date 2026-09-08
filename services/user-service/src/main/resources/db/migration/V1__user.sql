CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    auth_user_id UUID NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles (id),
    label VARCHAR(40) NOT NULL,
    line1 VARCHAR(200) NOT NULL,
    line2 VARCHAR(200),
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country CHAR(2) NOT NULL DEFAULT 'MY'
);

CREATE INDEX addresses_profile_idx ON addresses (profile_id);
