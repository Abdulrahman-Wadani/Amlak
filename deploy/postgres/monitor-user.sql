-- The read-only user Grafana Alloy uses for PostgreSQL metrics. Run once on
-- the server; the password comes from .env, not from this file:
--   docker compose -f compose.prod.yaml exec -T -e POSTGRES_MONITOR_PASSWORD db \
--     psql -U amlak -d amlak < deploy/postgres/monitor-user.sql
\getenv monitor_password POSTGRES_MONITOR_PASSWORD
CREATE ROLE alloy LOGIN PASSWORD :'monitor_password';
GRANT pg_monitor TO alloy;