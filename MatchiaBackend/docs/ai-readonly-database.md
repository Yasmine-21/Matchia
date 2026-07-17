# Matchia AI controlled Text-to-SQL

The browser sends only the administrator's question to `POST /api/ai-assistant/ask`. Gemini credentials remain in the backend. `DatabaseSchemaService` reads every real application table in the PostgreSQL `public` schema from `information_schema`, removes sensitive columns/tables, and supplies the remaining columns, data types, and verified foreign-key relationships to Gemini. The backend validates one PostgreSQL `SELECT`, runs the accepted query read-only, and sends only the capped result to Gemini for a French answer.

The model never gets a database connection, cannot execute a query itself, and the frontend never calls Gemini.

## Controls

- only one `SELECT` statement; no comments or semicolon;
- rejects `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `EXECUTE`, `CALL`, `COPY`, `DO`, `MERGE`, `SELECT INTO`, and row-locking clauses such as `FOR UPDATE`;
- restricts table references and qualified columns to the runtime filtered schema;
- rejects implicit comma joins, so every queried table must be declared through an allowlisted `FROM` or explicit `JOIN` reference;
- rejects `SELECT *`, sensitive identifiers, unsafe functions, and result limits above 50;
- appends `LIMIT 50` when Gemini omitted a limit;
- runs in a Spring read-only transaction with a 15-second timeout;
- access to the endpoint requires the `ADMIN_SAAS` role.

Sensitive credentials, tokens, Stripe identifiers, checkout URLs, reset/verification values, phones, request contacts, and notification message bodies are excluded from the schema and rejected by the validator. User `email` is intentionally permitted for SaaS administration.

## Subscription dates

Subscriptions are represented by paid rows in `payment`; expiry is `paid_at + INTERVAL '1 month'`. There is no physical subscription table or expiration column in this database.

## Production database account

For defence in depth, run the assistant read layer with a dedicated PostgreSQL data source/account that has no ownership or write grants. Adapt the database name/schema and secret delivery to your deployment process; do not commit the password.

```sql
CREATE ROLE matchia_ai_reader LOGIN PASSWORD '<stored-in-a-secret-manager>';
GRANT CONNECT ON DATABASE "matchiaSaaS" TO matchia_ai_reader;
GRANT USAGE ON SCHEMA public TO matchia_ai_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO matchia_ai_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO matchia_ai_reader;
```
