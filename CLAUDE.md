# CLAUDE.md

Fin-Pilot: Multi-asset investment portfolio management tool (A-shares, US stocks, ETFs, bonds, multi-currency).

## ⚠️ IMPORTANT: Always Use tmux for Long-Running Servers

**ALWAYS run backend/frontend servers in tmux sessions** to:
- Prevent server termination when Claude Code commands finish
- Avoid accidental port conflicts from multiple instances
- Keep servers running persistently across sessions

**tmux Commands:**
```bash
# Create new session for backend
tmux new-session -d -s wealthcraft -n backend
tmux send-keys -t wealthcraft 'cd /home/faelan/code/WealthCraft/app' Enter
tmux send-keys -t wealthcraft 'PORT=3001 npm run dev' Enter

# Create new session for frontend (optional)
tmux new-session -d -s wealthcraft-web -n frontend
tmux send-keys -t wealthcraft-web 'cd /home/faelan/code/WealthCraft/web' Enter
tmux send-keys -t wealthcraft-web 'npm run dev' Enter

# Attach to session
tmux attach -t wealthcraft

# List all sessions
tmux ls

# Kill session
tmux kill-session -t wealthcraft
```

## Project Structure

| Dir | Tech |
|-----|------|
| `app/` | Node.js + Express + TypeScript + Prisma (SQLite) |
| `web/` | React + TypeScript + Vite |
| `doc/` | Documentation |

## Commands

```bash
# Backend (RUN IN tmux!)
cd app && npm run dev              # Dev server
npm run prisma:migrate            # Migrate DB
npx tsc --noEmit                  # Type check

# Frontend (RUN IN tmux!)
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
- Currency: `Intl.NumberFormat('zh-CN')`
- Icons: `lucide-react`, Charts: `recharts`

## 🎯 Clean Code Principles

### File/Component Size Limits

| Type | Recommended | Warning | Unacceptable |
|------|-------------|---------|--------------|
| Component/Function | < 100 lines | 100-300 lines | > 300 lines |
| Service File | < 300 lines | 300-500 lines | > 500 lines |
| Page Component | < 400 lines | 400-800 lines | > 800 lines |

**Example Issue**: `PortfolioDetail.tsx` was 2049 lines ❌
- Contained 6 Modal components
- **Solution**: Extract modals to `web/src/components/portfolio/`

### Single Responsibility Principle (SRP)

A component/function should do ONE thing.

**Warning Signs**:
- Component name contains "And" or "Or"
- Component has > 5 useState hooks
- Component has > 500 lines
- Multiple unrelated concerns in one file

**File Organization**:
```
web/src/
├── components/          # Reusable UI components
│   ├── portfolio/       # Feature-specific components
│   │   ├── AddAssetModal.tsx
│   │   ├── SubPortfolioModal.tsx
│   │   └── index.ts
│   └── common/          # Shared components
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── pages/               # Route pages (should be thin)
```

**Page Components Should**:
- Fetch data
- Pass data to child components
- Handle routing
- Be < 400 lines

**Extract to Components When**:
- Modal logic is > 50 lines
- Form has > 5 fields
- Logic is reused in multiple places
- Component has deeply nested JSX

### When to Create New Files

**Create separate component file when**:
1. Component is > 100 lines
2. Component is used in multiple places
3. Component has complex state/logic
4. Component is a Modal, Form, or complex UI

**Create hook file when**:
1. Logic is reused across components
2. Logic involves multiple useState/useEffect
3. Logic can be tested independently

**Create utility file when**:
1. Pure functions (no side effects)
2. Format/validation functions
3. Calculation functions

### Code Review Checklist

Before committing, ask:
- [ ] Is any file > 500 lines? Consider splitting.
- [ ] Does any component have > 5 state variables? Consider custom hook.
- [ ] Are there duplicated code blocks? Extract to function.
- [ ] Is JSX nested > 4 levels? Extract component.

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
