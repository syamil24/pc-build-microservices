# Contributing

Read `.cursor/rules` before opening a service. The same shape is used everywhere:

- `apex-common` holds records, errors, JWT, and topic names.
- `apex-web` holds the security filter chain, circuit breaker, cache client, and Kafka publisher.
- A service controller returns `ResponseEntity<ApiResponse<T>>`.
- Request bodies are validated records. JPA entities are not response bodies.
- Failures throw `ApexException`.
- Another service is called with `RemoteClients` and the internal token. The gateway strips that header from browsers.
- New tables are a new Flyway version in that service only.

Java is 4-space, YAML and TypeScript are 2-space. See `.editorconfig`.

Local secrets live in `.env`, which is gitignored. Do not commit passwords, `JWT_SECRET`, or CHIP keys.

Run the unit tests with `mvn test`. Run the shop UI tests with `npm run test:e2e` inside `webapp`.
