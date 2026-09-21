# TradeLab

TradeLab is an educational paper-trading simulator for replaying fictional market data, placing virtual trades, journaling decisions, and studying trading behaviour.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/tradelab` — React + Vite frontend with landing, auth, trader, replay, portfolio, journal, analytics, admin, and settings routes.
- `artifacts/api-server/src/routes/tradelab.ts` — server-owned seeded replay, order, portfolio, journal, and analytics flow.
- `lib/api-spec/openapi.yaml` — source of truth for the API contract and generated client hooks.
- `artifacts/tradelab/src/index.css` — TradeLab dark navy / electric-lime visual system.

## Architecture decisions

- The first vertical slice uses seeded fictional instruments and server-side simulation state so TradeLab never depends on live market data.
- Client calls are generated from the OpenAPI contract; order validation, execution, balances, portfolio values, and analytics are calculated on the server.
- Persistence is kept behind the service boundary so the current simulator can later use Google Sheets or PostgreSQL without changing the frontend contract.
- The product always labels data as simulated educational content and does not provide trading recommendations.

## Product

- Learners can replay TLAB, NIFTY-DEMO, RELIANCE-DEMO, and INFY-DEMO candle data.
- Learners can place virtual market, limit, and stop orders, review their portfolio, complete a trade journal, and inspect behavioural analytics.
- The first build includes admin and settings surfaces for the broader product shape.

## User preferences

No additional preferences recorded.

## Gotchas

- The API server is mounted at `/api`; the frontend must use generated hooks rather than hard-coded service ports.
- Google Sheets is not connected yet; the repository boundary is ready for the connector once authorized.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
