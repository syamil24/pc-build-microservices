# Apex Build

A PC-builder shop: custom rigs, laptops, and parts. The catalog, compatibility check, cart, CHIP payment, and emulated courier are separate Spring Boot services behind one gateway.

The shop UI is at `http://localhost:5173` after the run script. Prices are Malaysian ringgit.

## What you get

- Auth, user, inventory, order, payment, shipping, cache, discovery, and a Spring Cloud Gateway.
- The gateway load-balances three payment instances.
- Discovery registers every service in Eureka and polls health, CPU, heap, and free disk. Admins open **Live ops** from the back office.
- Redis is reached only through the cache service.
- Kafka carries registration, payment, and shipping events.
- Resilience4j circuit breakers sit on every outbound call.
- Each API call is one log line with the shopper and the action. The same trace id runs from the gateway through the service that handled the call.
- Today's log stays in `logs/`. Older days move to `logs/archive` and are kept for 90 days.
- Dockerfiles are present for a later container deploy. The run scripts use fat jars.

## Prerequisites

- JDK 21 and Maven (already used by the build)
- PostgreSQL 17 listening on localhost
- Node.js 22 for the shop
- Redis and Kafka, installed by the scripts below

## 1. Install Redis, Kafka, and MinIO

Linux, WSL, or macOS:

```bash
bash scripts/install-deps.sh
```

The script logs every command to `~/.apex-build/install.log` and prints the failing output if a step breaks. It installs JDK 21, Maven, Redis, and Kafka when they are missing, and downloads the MinIO server and `mc` client into `~/.apex-build/minio`. Those binaries are the last community releases that still publish files; newer MinIO tags are source-only. On macOS it uses Homebrew for the language tools.

Windows, from this folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-deps.ps1
```

## 2. Configure environment

```bash
cp .env.example .env
```

Set `DB_PASSWORD` to the local PostgreSQL password. Leave the secret fields empty. `scripts/run-all.sh` (or the PowerShell twin) generates `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, and the two demo passwords, and writes them into `.env`.

CHIP stays in `demo` until you set:

```
CHIP_MODE=live
CHIP_SECRET_KEY=...
CHIP_BRAND_ID=...
CHIP_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
```

The public key is the PEM from `GET /public_key/` or from the webhook you create in the CHIP portal. Newlines may be written as `\n`.

## 3. Create the databases

```bash
bash scripts/init-db.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\init-db.ps1
```

This creates `apex_auth`, `apex_user`, `apex_inventory`, `apex_order`, `apex_payment`, `apex_shipping`, `apex_report`, and `apex_keycloak`. Flyway creates the tables when the services start. To apply the SQL without booting the apps:

```bash
bash scripts/apply-schema.sh
```

The product catalog is loaded by the inventory service the first time it starts (`catalog-seed.json`).

## Keycloak

Sign-in is OpenID Connect through Keycloak, with realm roles `CUSTOMER` and `ADMIN`. The shop uses the authorization code flow and PKCE. Service calls still check the access token, and service-to-service calls still use `X-Internal-Token`.

On macOS or Linux, `scripts/install-keycloak.sh` downloads Keycloak 25.0.4 into `~/.apex-build/keycloak` and writes a Postgres config for a new database, `apex_keycloak`. On this Windows PC the same scripts use the installed copy at `H:\PNB Job\keycloak-25.0.4` and point that process at `apex_keycloak`, so the existing `keycloak` database is left alone. The management port is 9002 because 9000 is MinIO.

`scripts/run-all.ps1` and `scripts/run-all.sh` start Keycloak and then run the realm setup. You can also run the setup on its own after Keycloak is listening on port 8180:

```bash
bash scripts/setup-keycloak.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-keycloak.ps1
```

That creates the realm `apex`, the public client `apex-web`, the two roles, and the demo customer and admin. Set `KEYCLOAK_ADMIN_PASSWORD` in `.env` before setup. A fresh database receives the password `run-all` generated. The demo users sign in at the shop with the same emails and passwords as before; the form itself is the Keycloak page.

## 4. Run everything

Linux, WSL, or macOS, including the 8GB MacBook profile:

```bash
bash scripts/run-all.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1
```

The script prints the demo customer and admin passwords. `scripts/stop-all.sh` and `scripts/stop-all.ps1` stop the processes recorded in `.run`.

On an 8GB machine, close extra browsers and set nothing else. The default JVM profile is the small one. Use `APEX_JVM_PROFILE=full` only when you have memory to spare.

## 5. Load the full catalog

The shop starts with a small fictional seed so the builder demo still works. To add current CPUs, boards, memory, GPUs, storage, power supplies, cases, coolers, laptops, monitors, and peripherals, run the pump. It writes demo shelf prices in Malaysian ringgit cents and upserts by SKU, so running it again updates rows instead of duplicating them.

macOS or Linux:

```bash
bash scripts/pump-catalog.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pump-catalog.ps1
```

The generator is `scripts/catalog/emit-sql.js`. It writes `scripts/catalog/catalog.sql`, and the pump applies that file to `apex_inventory` only. Category pages can take up to two minutes to refresh because that list is cached.

## 6. Upload catalog images

`scripts/pump-images.sh` and `scripts/pump-images.ps1` draw a 1200 by 900 picture for each pumped SKU, upload it to the MinIO `catalog` bucket, and save the public URL on that product. The shop frame is the same 4:3 ratio, so the picture fills the card on desktop and on a phone without stretching. Products that have no URL keep the colour swatch. Run the catalog pump first, and run this again any time you want to replace the pictures.

macOS or Linux:

```bash
bash scripts/pump-images.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pump-images.ps1
```

## 7. Load demo orders and sales

Sales reports read `apex_report`, which is the report service's own database. The sales pump also writes matching fulfilled orders for the demo customer in `apex_order`. It covers May through October 2026 and every catalog category. Running it again updates the same rows.

macOS or Linux:

```bash
bash scripts/pump-sales.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pump-sales.ps1
```

Start the stack once before the first pump, so auth can seed the demo customer and Flyway can create `order_lines.category_code` and `sales_facts`.

## 8. Stop the shop, Redis, Kafka, Keycloak, and MinIO

`scripts/kill-all.sh` (macOS and Linux) and `scripts/kill-all.ps1` (Windows) stop the Apex jars, the webapp, Redis, Kafka, Keycloak, and MinIO, including listeners on the Apex ports. PostgreSQL is left running.

```bash
bash scripts/kill-all.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts\kill-all.ps1
```

## 9. Use the shop

1. Open `http://localhost:5173`.
2. Register, or log in with the demo customer from `.env`.
3. Add an address under Account.
4. Open **PC Builder**, pick parts, and watch the price and the compatibility list.
5. A DDR4 kit on a DDR5 board is rejected. A 550W supply on a hot GPU is rejected.
6. Add the build to the cart and check out.
7. On the demo till, choose **Pay now**. The order page then walks the emulated shipment every 15 seconds.
8. Log in as the demo admin. **Admin** opens product create, edit, and deactivate, the Jasper sales report, and **Live ops**. Customers are turned away from those pages and from `/api/platform`, `/api/reports`, and `/api/catalog/admin`.

Search, category, and min/max price filters are on **Shop**.

## Logs

`logs/<service>.log` is today's file. The gateway writes a line when a request arrives and another when it finishes. Each service writes one line with the user, the role, and the action. Match `[trace=…]` across those files to follow one checkout. The span id changes for each step.

At midnight the file moves to `logs/archive/<service>.yyyy-MM-dd.log`. Archives older than 90 days are deleted. Redis, MinIO, Keycloak, the shop, and Kafka's text log use the same folder. The three payment processes log as `payment-1`, `payment-2`, and `payment-3`.

## Watch Kafka and Redis

Run these while the stack is up.

macOS or Linux:

```bash
bash scripts/monitor-kafka.sh
bash scripts/monitor-redis.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\monitor-kafka.ps1
powershell -ExecutionPolicy Bypass -File scripts\monitor-redis.ps1
```

The Kafka script prints the cluster, topics, partitions, offsets, consumer lag, partition size, the tail of `logs/kafka.log`, and the latest events. It calls Java with `libs*` because the Windows `kafka-*.bat` tools exceed the command-line limit. Add `--watch` or `-Watch` to refresh the live sections every 5 seconds. The event list is printed on a single run.

The Redis script prints memory and the first 100 keys with their values. A value longer than 500 characters is shortened.

## Tests and the agent loop

```bash
mvn test
cd webapp && npm install && npx playwright install chromium && npm run test:e2e
bash scripts/smoke-test.sh          # stack must already be running
APEX_PUSH=true bash scripts/agent-pipeline.sh
```

`APEX_PUSH` pushes the current branch only when `origin` is configured. GitHub Actions runs the unit tests and the Playwright shop tests on pull requests.

## Layout

```
apex-common/          shared records, JWT, topics
apex-web/             security, circuit breaker, cache client, tracing
services/*            one Spring Boot service each, with a Dockerfile
webapp/               React shop
scripts/              install, database, run, pumps, monitors
ARCHITECTURE.md       services, checkout, Kafka, and traces
.cursor/rules/        contributor rules
```

## Ports

| Process | Port |
| --- | --- |
| Gateway | 8080 |
| Auth | 8081 |
| User | 8082 |
| Inventory | 8083 |
| Order | 8084 |
| Payment | 8085, 8185, 8285 |
| Shipping | 8086 |
| Cache | 8087 |
| Report | 8088 |
| Eureka / discovery | 8761 |
| Keycloak | 8180 |
| Shop | 5173 |
| Kafka | 9092 |
| Redis | 6379 |
| MinIO API / console | 9000 / 9001 |
| Postgres | 5432 |

Swagger UI is on each service, for example `http://localhost:8083/swagger-ui.html`.

## Docker later

Each service has a Dockerfile that runs its fat jar with the same small heap. Build the jars first (`mvn -DskipTests package`), then `docker build` inside that service directory. The webapp Dockerfile builds the Vite app. Nothing in `scripts/run-all.sh` starts Docker.
