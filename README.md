# Apex Build

A PC-builder shop: custom rigs, laptops, and parts. The catalog, compatibility check, cart, CHIP payment, and emulated courier are separate Spring Boot services behind one gateway.

The shop UI is at `http://localhost:5173` after the run script. Prices are Malaysian ringgit.

## What you get

- Auth, user, inventory, order, payment, shipping, cache, discovery, and a Spring Cloud Gateway.
- The gateway load-balances three payment instances.
- Discovery registers every service in Eureka and polls health, CPU, heap, and free disk. Open **Live ops** in the shop.
- Redis is reached only through the cache service.
- Kafka carries registration, payment, and shipping events.
- Resilience4j circuit breakers sit on every outbound call.
- Logs include `traceId` and `spanId` so one checkout can be followed across services.
- Dockerfiles are present for a later container deploy. The run scripts use fat jars.

## Prerequisites

- JDK 21 and Maven (already used by the build)
- PostgreSQL 17 listening on localhost
- Node.js 22 for the shop
- Redis and Kafka, installed by the scripts below

## 1. Install Redis and Kafka

Linux, WSL, or macOS:

```bash
bash scripts/install-deps.sh
```

The script logs every command to `~/.apex-build/install.log` and prints the failing output if a step breaks. It installs JDK 21, Maven, Redis, and Kafka when they are missing. On macOS it uses Homebrew.

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

This creates `apex_auth`, `apex_user`, `apex_inventory`, `apex_order`, `apex_payment`, and `apex_shipping`. Flyway creates the tables when the services start. To apply the SQL without booting the apps:

```bash
bash scripts/apply-schema.sh
```

The product catalog is loaded by the inventory service the first time it starts (`catalog-seed.json`).

## 4. Run everything

Linux, WSL, or macOS, including the 8GB MacBook profile:

```bash
bash scripts/run-all.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1
```

The script prints the demo customer and admin passwords. Stop the stack with `scripts/stop-all.sh` or `scripts/stop-all.ps1`.

On an 8GB machine, close extra browsers and set nothing else. The default JVM profile is the small one. Use `APEX_JVM_PROFILE=full` only when you have memory to spare.

## 5. Use the shop

1. Open `http://localhost:5173`.
2. Register, or log in with the demo customer from `.env`.
3. Add an address under Account.
4. Open **PC Builder**, pick parts, and watch the price and the compatibility list.
5. A DDR4 kit on a DDR5 board is rejected. A 550W supply on a hot GPU is rejected.
6. Add the build to the cart and check out.
7. On the demo till, choose **Pay now**. The order page then walks the emulated shipment every 15 seconds.
8. Open **Live ops** to see three payment instances and the health of the rest.

Search, category, and min/max price filters are on **Shop**.

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
scripts/              install, database, run, smoke, agent pipeline
docs/ARCHITECTURE.md  flows and ports
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
| Eureka / discovery | 8761 |
| Shop | 5173 |
| Kafka | 9092 |
| Redis | 6379 |
| Postgres | 5432 |

Swagger UI is on each service, for example `http://localhost:8083/swagger-ui.html`.

## Docker later

Each service has a Dockerfile that runs its fat jar with the same small heap. Build the jars first (`mvn -DskipTests package`), then `docker build` inside that service directory. The webapp Dockerfile builds the Vite app. Nothing in `scripts/run-all.sh` starts Docker.
