# Apex Build architecture

Apex Build is a PC-builder shop. The browser talks to one gateway. Each business area is its own Spring Boot service with its own PostgreSQL database. Services call each other over HTTP through Eureka, and they tell each other about facts that already happened over Kafka.

Java 21, Spring Boot 3.5, Spring Cloud 2025. Prices are Malaysian ringgit stored as integer cents (`priceCents`). A service never reads another service's database.

## Shape

```text
browser (Vite, :5173)
    |
    |  /api
    v
gateway (:8080) ---- strips inbound X-Internal-Token, checks the bearer token
    |
    +-- auth (:8081)            apex_auth
    +-- user (:8082)            apex_user
    +-- inventory (:8083)       apex_inventory     catalog, stock, reservations
    +-- order (:8084)           apex_order         cart and orders
    +-- payment (:8085)         apex_payment       also :8185 and :8285
    +-- shipping (:8086)        apex_shipping
    +-- report (:8088)          apex_report
    +-- discovery / Eureka (:8761)

not on the public gateway:
    cache (:8087)  -->  Redis
    Keycloak (:8180)  realm apex, public client apex-web
    MinIO (:9000)     product image files
    Kafka (:9092)     four shop topics
```

The Vite dev server proxies `/api` to the gateway. The gateway routes by path and load-balances with the Eureka name (`lb://inventory-service`). Live ops is the exception: `/api/platform/**` is forwarded to the discovery process on port 8761.

Shared types, topic names, and JWT parsing live in `apex-common`. Servlet security, the internal-token filter, outbound HTTP, Kafka publishing, and the access log live in `apex-web`. The gateway depends on `apex-common` only. A service does not depend on another service's jar.

Inside a service the packages are `config`, `domain`, `repo`, `service`, `web`, `client`, and `messaging`. Schema changes are Flyway files in that service. Hibernate validates the schema and does not create tables.

## Services

| Service | Port | Database | Owns |
|---|---|---|---|
| gateway | 8080 | none | Routing, CORS, authentication, the arrival trace |
| auth | 8081 | `apex_auth` | Local accounts, refresh tokens, the link to Keycloak |
| user | 8082 | `apex_user` | Profile and delivery addresses |
| inventory | 8083 | `apex_inventory` | Categories, products, compatibility quotes, stock reservations |
| order | 8084 | `apex_order` | Cart, checkout, order status |
| payment | 8085, 8185, 8285 | `apex_payment` | The charge, demo till or CHIP |
| shipping | 8086 | `apex_shipping` | The emulated courier |
| cache | 8087 | Redis | The only process that speaks to Redis |
| report | 8088 | `apex_report` | Sales facts and the Jasper PDF |
| discovery | 8761 | none | Eureka and the live-ops snapshot |

`run-all` starts three payment JVMs from the same jar so the gateway can balance charges. They share `apex_payment`. Every other service is one process.

## A request

1. The shop sends `Authorization: Bearer …` to the gateway.
2. The gateway removes any `X-Internal-Token` the browser sent. That header is only for service-to-service calls.
3. Public reads (catalog, the builder quote, register, login, refresh, the CHIP callback) continue without a token. Everything else needs a valid token. `/api/platform`, `/api/reports`, and `/api/catalog/admin` also require the `ADMIN` role.
4. The gateway opens one trace and forwards the call. The service that handles it continues that same trace id and writes its own span id.
5. When one service calls another it uses `http://<eureka-name>` through `RemoteClients`, which adds `X-Internal-Token` and runs the call inside a Resilience4j circuit breaker. A 4xx from the other service is returned as that service's error. A 5xx or a timeout counts toward the breaker.

The breaker names are `inventory`, `payment`, `user`, `cache`, `shipping`, and `chip`. Cache reads are written so a catalog page still works when Redis is down.

## Sign-in

The shop signs in with Keycloak, realm `apex`, public client `apex-web`, authorization code and PKCE. Realm roles are `CUSTOMER` and `ADMIN`. The access token is an RSA JWT. `JwtService` loads the realm keys from Keycloak and reads `apex_user_id`, falling back to the Keycloak subject.

`GET /api/auth/me` upserts that id into `apex_auth.users`. Registration also publishes `apex.user.registered`. The user service creates the profile from that event, and auth tries the same create over HTTP in case the user service is already up. The Kafka event is the durable path.

Auth can still issue its own HMAC access token from `POST /api/auth/login` and `POST /api/auth/register`. The gateway accepts either kind of token. Refresh tokens for that local login are stored only as a SHA-256 hash.

## Browse and build

Inventory owns the catalog: categories, products, integer prices, stock, a JSON `specs` document, and an `image_url`. The picture bytes live in MinIO. The product row only stores the URL.

`POST /api/catalog/builder/quote` prices the chosen parts and runs the compatibility rules (socket, memory generation, and the other builder checks). The browser uses that quote while the shopper is still building. Category lists are cached for 120 seconds and a single product for 60 seconds, under keys `apex:catalog:…` and `apex:product:…`. Only the cache service talks to Redis. Other services call `http://cache-service`. There is no public `/api/cache` route.

Adding a part or a whole build writes the cart in the order database. The cart stores the product id and the price shown at the time. Checkout does not trust that price.

## Checkout

Checkout is the order service coordinating the others. It does not update their tables.

```text
shopper                order                 inventory            user              payment
  |                      |                       |                  |                  |
  | POST /checkout       |                       |                  |                  |
  |--------------------->| quote(lines)          |                  |                  |
  |                      |---------------------->|                  |                  |
  |                      | prices + compatible   |                  |                  |
  |                      |<----------------------|                  |                  |
  |                      | address snapshot      |                  |                  |
  |                      |----------------------------------------->|                  |
  |                      | save order AWAITING_PAYMENT              |                  |
  |                      | reserve(orderId)      |                  |                  |
  |                      |---------------------->| hold stock       |                  |
  |                      | charge(orderId, cents)|                  |                  |
  |                      |----------------------------------------------------------->|
  |                      | checkoutUrl           |                  |                  |
  |<---------------------|                       |                  |                  |
```

If the reserve or the charge throws, the order service releases the hold and marks the order `CANCELLED`.

The shopper then opens the checkout URL. In demo mode that is `/pay/demo/{paymentId}` on the shop, and confirming it marks the payment paid. In live mode the payment service calls CHIP and waits for `POST /api/payments/chip/callback`. Either way, a paid charge publishes `apex.payment.succeeded` and a failed charge publishes `apex.payment.failed`.

Three listeners react to a successful payment:

- Order sets the order to `PAID` and tells inventory to confirm the reservation, which takes the units out of stock.
- Shipping creates a shipment and a tracking number.
- Report reads the order over HTTP (`/api/orders/internal/{id}`) and writes one sales-fact row per line into `apex_report`. That is how the admin sales screen and the Jasper PDF get their numbers without reading `apex_order`.

A failed payment sets the order to `PAYMENT_FAILED` and releases the hold.

The courier is a timer inside shipping. Every 15 seconds it moves open shipments one step: `CREATED`, `PICKED`, `PACKED`, `SHIPPED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`. Each step publishes `apex.shipping.updated`. When the status is `DELIVERED`, the order service sets the order to `FULFILLED`.

## Kafka

One broker, KRaft, `localhost:9092`. Topics are created on first use. The key is the user id or the order id. The body is JSON with `eventId`, `type`, `occurredAt`, `traceId`, and `payload`.

| Topic | Published by | Consumed by |
|---|---|---|
| `apex.user.registered` | auth | user |
| `apex.payment.succeeded` | payment | order, shipping, report |
| `apex.payment.failed` | payment | order |
| `apex.shipping.updated` | shipping | order |

There is no dead-letter topic. A listener logs the failure and the message stays at the committed offset the listener reached. `scripts/monitor-kafka.ps1` (and the shell twin) prints topics, partitions, offsets, consumer lag, partition size, and the latest events. It calls Kafka with `java -cp libs*` because the Windows `kafka-*.bat` tools exceed the command-line length.

## Auth boundary

| Caller | Credential |
|---|---|
| Browser | Bearer access token. The gateway rejects a browser-supplied `X-Internal-Token`. |
| Service to service | `X-Internal-Token` from `INTERNAL_SERVICE_TOKEN`, plus the Eureka address. |
| Admin screens | Bearer token whose role is `ADMIN`. |

`/api/orders/internal/**`, `/api/users/internal/**`, and `/api/inventory/reservations/**` are for services, not for the shop UI.

## Logs and traces

One shop request has one trace id from the gateway through every service that request touches. Each step has its own span id. Log lines are:

```text
2026-10-18 14:11:21.100 INFO [trace=6ad43617…] [span=aad68f92…] c.a.web.trace.AccessLogFilter - …
```

The gateway writes an arrival line when the request comes in, then the usual result line. Each service writes one result line naming the user, role, action, method, path, status, and time. Startup lines have an empty trace because no request is in progress.

Today's file is `logs/<service>.log`. Previous days move to `logs/archive` and are kept for 90 days. Payment instances log as `payment-1`, `payment-2`, and `payment-3`. Redis, MinIO, Keycloak, the shop, and Kafka's own text log are tailed by the run scripts into the same folder. Zipkin export stays off unless `ZIPKIN_ENABLED=true`.

`scripts/monitor-redis.ps1` prints server, memory, and the first 100 keys with their values.

## What stays local to a service

- Money is integer cents. Nothing in the pricing path uses floating point.
- Secrets (`JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, database password, CHIP keys, Keycloak admin password) come from `.env`. They are not written into source.
- Outbound HTTP goes through `ProtectedCall`.
- A new table is a Flyway `V{n}__name.sql` in the service that owns it.
