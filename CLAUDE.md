# CLAUDE.md

Fin-Pilot: Multi-asset investment portfolio management tool (A-shares, US stocks, ETFs, bonds, multi-currency).

## Project Structure

| Dir | Tech |
|-----|------|
| `app/` | Node.js + Express + TypeScript + Prisma (SQLite) |
| `web/` | React + TypeScript + Vite |
| `doc/` | Documentation |

## Commands

```bash
# Backend
cd app && npm run dev              # Dev server
npm run prisma:migrate            # Migrate DB
npx tsc --noEmit                  # Type check

# Frontend
cd web && npm run dev              # Dev server
npx tsc --noEmit                  # Type check

# Servers
skill start-dev status            # Check both servers
skill pre-delivery-check          # Pre-delivery checklist
```

## Architecture

**Backend**: Routes → Controllers → Services → Prisma
**Frontend**: Pages + Context + API Client
**Auth**: JWT via `Authorization: Bearer <token>`

**Key Models**:
- Portfolio (sub-portfolios, CONTRIBUTION/ALLOCATION rules)
- Asset (market: SSE, NASDAQ, etc.)
- Transaction (BUY/SELL/DIVIDEND/FEE)
- Channel (trading channels)
- MarketInstrument (master data)

## Code Conventions

**Backend**:
- Controllers: class syntax with async methods
- User ID: `req.user!.userId`
- Pagination: `{ data, pagination: { page, pageSize, total, totalPages } }`

**Frontend**:
- Functional components + hooks
- Modals in same file as parent
- Currency: `Intl.NumberFormat('zh-CN')`
- Icons: `lucide-react`, Charts: `recharts`

## Data Migration

**CRITICAL**: Never delete user data.

**Safe Pattern**:
```prisma
// ✅ Add optional field
channelId String?

// ❌ DON'T drop/delete/migrate reset
```

**After migration**: Check SQL for DROP/DELETE/TRUNCATE

## Common Pitfalls

❌ **DB ops in terminal** → Use API endpoints, batch 100 records
❌ **Hot reload** → Wait for restart, check `lsof -ti:3001` for conflicts
❌ **Type assumptions** → Verify actual types (e.g., `1` vs `"1"`)
❌ **Long ops** → Add timeout, batch processing

## Recovery

```bash
lsof -ti:3001 | xargs kill -9     # Kill orphaned
skill start-dev restart           # Restart
```

## Environment

`app/.env`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET=<secret>
PORT=3001
```
