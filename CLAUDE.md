# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fin-Pilot is a multi-asset investment portfolio management tool for individual investors. It supports A-shares, US stocks, ETFs, bonds, and multi-currency portfolios (CNY, USD).

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `app/` | Backend - Node.js + Express + TypeScript + Prisma (SQLite) |
| `web/` | Frontend - React + TypeScript + Vite |
| `doc/` | Documentation (requirements, API docs) |

## Common Commands

### Backend (`app/`)
```bash
cd app
npm run dev              # Start development server with hot reload
npm run build            # Compile TypeScript
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)
npx tsc --noEmit         # Type check without emitting files
```

### Frontend (`web/`)
```bash
cd web
npm run dev      # Start Vite development server
npm run build    # Build for production
npm run lint     # Run ESLint
```

### Prisma Workflow
After modifying `app/prisma/schema.prisma`:
1. Run `npx prisma migrate dev --name <migration_name>` to create migration
2. If EPERM error occurs on Windows: `rm -rf node_modules/.prisma && npx prisma generate`

## Architecture

### Backend Structure
- **Routes** (`app/src/routes/`) - Express route definitions, use `authenticate` middleware
- **Controllers** (`app/src/controllers/`) - Request handlers, use `AuthRequest` type from `types/`
- **Services** (`app/src/services/`) - Business logic layer
- **Middleware** (`app/src/middleware/`) - Auth (`authenticate`), error handling
- **Types** (`app/src/types/`) - TypeScript interfaces including `AuthRequest`, `JwtPayload`

### Frontend Structure
- **Pages** (`web/src/pages/`) - Route components (Dashboard, PortfolioDetail, Channels)
- **Context** (`web/src/context/`) - React Context for auth state
- **API** (`web/src/api/client.ts`) - Axios-based API client with all endpoints
- **Types** (`web/src/types/`) - TypeScript interfaces for frontend models

### Key Domain Models
- **Portfolio** - Can have sub-portfolios (non-nestable), two rule types: CONTRIBUTION (定投) or ALLOCATION (固定比例)
- **SubPortfolio** - Groups assets within a portfolio, inherits rule type from parent
- **Asset** - Can belong to portfolio directly or through sub-portfolio. Field `market` specifies exchange (SSE, SSE_FUND, SSE_BOND, NASDAQ, NYSE, AMEX, US_ETF)
- **Transaction** - BUY/SELL/DIVIDEND/FEE operations, linked to optional Channel
- **Channel** - User-defined trading channels (e.g., 南方基金, Tiger Brokers, IBKR)
- **MarketInstrument** - Master data synced from third-party APIs

### Investment Rules
- **CONTRIBUTION** (定投): Regular fixed-amount investments with period (DAILY/WEEKLY/MONTHLY)
- **ALLOCATION** (固定比例): Target percentage-based allocation with rebalancing recommendations

### API Authentication
- JWT-based authentication via `Authorization: Bearer <token>` header
- Auth middleware: `authenticate` (not `authenticateToken`)
- Controller methods receive `AuthRequest` with `req.user.userId`

## Code Conventions

### Backend
- Controllers use class syntax with async methods
- Services handle database operations via Prisma
- User ID accessed as `req.user!.userId` (not `req.user.id`)
- Pagination returns `{ data, pagination: { page, pageSize, total, totalPages } }`

### Frontend
- Functional components with hooks
- Modal components defined in same file as parent page
- Currency formatting: `Intl.NumberFormat` with 'zh-CN' locale
- Icons from `lucide-react`
- Charts from `recharts`

## Environment Variables

Backend (`app/.env`):
```
DATABASE_URL="file:./dev.db"
JWT_SECRET=<secret>
PORT=3001
```
