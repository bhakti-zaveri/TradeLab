# Architecture

## Frontend Structure
The frontend is a React application built with Vite (`@workspace/tradelab`).
- **Framework:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + Radix UI components
- **Routing:** Wouter (simple hash/history routing)
- **State & Data Fetching:** React Query for caching and syncing with the API, with an auto-generated or custom client (`@workspace/api-client-react`) interacting with REST endpoints.
- **Key Views:** Dashboard (Portfolio summary, recent trades), Replay Mode (Candlestick chart, active trading simulator), Journal (Post-trade review and analytics).

## Backend Structure
The backend is a Node.js API built with Express (`@workspace/api-server`).
- **Runtime:** Node.js + Express
- **Schema Validation:** Zod (`@workspace/api-zod`) ensures types are consistent between client and server.
- **Persistence Layer:** A lightweight service module (e.g., `sheetsRepository.ts` or a new `dataService.ts`) handles reading/writing to a Google Sheet (or local Excel file) acting as the single source of truth database.
- **State:** In-memory caching for active replays and fast retrieval, syncing back to the sheet asynchronously or on-demand to maintain persistence.

## Sheet Schema (Database)
We will use a single Google Sheet (or Excel file) with multiple tabs (worksheets) acting as database tables.

### 1. `Instruments` (The assets available for trading/replay)
| Column | Type | Description |
|---|---|---|
| symbol | String | Unique identifier (e.g., TLAB, NIFTY-DEMO) |
| name | String | Display name |
| exchange | String | Exchange label |
| description | String | Short summary of the asset |

### 2. `MarketData` (Historical/Replay Candles)
| Column | Type | Description |
|---|---|---|
| symbol | String | Links to Instruments |
| time | String (ISO) | Timestamp of the candle |
| open | Number | Open price |
| high | Number | High price |
| low | Number | Low price |
| close | Number | Close price |
| volume | Number | Volume traded |

### 3. `Orders` (Simulated Orders)
| Column | Type | Description |
|---|---|---|
| id | String | Unique order ID |
| symbol | String | Instrument symbol |
| side | String | "buy" or "sell" |
| orderType | String | "market", "limit", or "stop" |
| quantity | Number | Amount of shares/contracts |
| limitPrice | Number | Target price (optional) |
| stopPrice | Number | Stop loss (optional) |
| status | String | "executed", "pending", "cancelled" |
| executedPrice | Number | Fill price if executed |
| createdAt | String (ISO) | Order creation time |
| journalStatus | String | "complete", "needs_review", "not_required" |

### 4. `Trades` (Completed entries/exits + Journal)
| Column | Type | Description |
|---|---|---|
| id | String | Unique trade ID |
| symbol | String | Instrument symbol |
| side | String | "buy" or "sell" |
| entryPrice | Number | Entry average |
| exitPrice | Number | Exit average |
| quantity | Number | Total size |
| realisedPnl | Number | Net profit/loss |
| returnPct | Number | Percentage return |
| reason | String | Journal: Reason for trade |
| mistake | String | Journal: Mistake made |
| plannedStop | Number | Journal: Initial stop loss |
| journalStatus | String | "needs_review" or "complete" |
| executedAt | String (ISO) | Completion time |

### 5. `Portfolio` (Current state of cash and positions)
| Column | Type | Description |
|---|---|---|
| id | String | Position ID or "CASH" for cash balance |
| symbol | String | Instrument symbol (blank if CASH) |
| quantity | Number | Current held amount |
| averagePrice | Number | Average cost basis |
| stopLoss | Number | Current active stop loss |

*(Note: We can also keep cash in a simple `Settings` sheet or as a dedicated row in `Portfolio`)*

## API Endpoints

All endpoints respond with JSON and use standardized error responses.

- `GET /api/instruments`
  - Returns the list of all available instruments from the `Instruments` sheet.
- `GET /api/dashboard`
  - Returns aggregated user portfolio status, open positions, active replay state, and recent trades.
- `GET /api/replay`
  - Returns current replay state (current candle, speed, playing status).
- `POST /api/replay/action`
  - Controls replay (play, pause, next candle). Updates in-memory state.
- `GET /api/portfolio`
  - Retrieves current cash and live positions.
- `GET /api/orders`
  - Returns the user's order history from the `Orders` sheet.
- `POST /api/orders`
  - Places a new order. Writes to `Orders`, updates `Portfolio`, and potentially generates a new `Trade`.
- `GET /api/trades`
  - Returns closed trades from the `Trades` sheet.
- `POST /api/journal`
  - Updates a specific trade with journal notes (reason, mistake, confidence). Writes back to `Trades`.
- `GET /api/analytics`
  - Returns aggregated behavioral analytics (win rate, profit factor, pnl by reason) calculated from the `Trades` sheet.
