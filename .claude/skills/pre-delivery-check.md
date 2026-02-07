---
description: Pre-delivery checklist. Run this before claiming work is "done".
---

# Pre-Delivery Checklist

## Essential Checks

```bash
# 1. Server health
./scripts/dev-servers.sh status
# → Backend: http://localhost:3001, Frontend: http://localhost:5173

# 2. Type check
cd app && npx tsc --noEmit
cd web && npx tsc --noEmit

# 3. Functionality test
# Test your changes in browser/API

# 4. No service disruption
# → No crashes, no orphaned processes, no port conflicts
```

## Quick Recovery

```bash
# Kill orphaned processes
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Restart servers
./scripts/dev-servers.sh restart
```

## Critical Mistakes

❌ **Don't** run large DB operations in terminal → Use API endpoints
❌ **Don't** assume API types → Verify actual data types
❌ **Don't** modify hot-reload files while testing → Wait for restart
❌ **Don't** delete data → Review migration SQL first

**Remember**: User tests immediately. Broken code = lost trust.
