# Agent guide

Work in this order when changing Apex Build:

1. Keep the bounded context. A service reads only its own database.
2. Put shared API types in `apex-common` and servlet/security/Kafka helpers in `apex-web`.
3. Add a Flyway file for schema changes. Do not turn Hibernate DDL back on.
4. Cover domain rules with a plain JUnit test. Do not boot Postgres in unit tests.
5. Run `mvn -B test` before packaging.
6. For UI changes, run `npm run test:e2e` in `webapp`.
7. With the stack up, run `scripts/smoke-test.sh`.
8. Push only when `APEX_PUSH=true` and `origin` exists: `scripts/agent-pipeline.sh`.

Package layout inside every service: `config`, `domain`, `repo`, `service`, `web`, `client`, `messaging`.
Money is integer cents. Outbound HTTP goes through `ProtectedCall`.
