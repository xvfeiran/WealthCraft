---
description: Manage dev servers in tmux (we-backend: 3001, we-frontend: 5173)
arguments:
  - name: action
    description: Action (start/stop/restart/status/attach-backend/attach-frontend)
    required: false
    default: start
---

# Development Servers

**Sessions**: `we-backend` (3001), `we-frontend` (5173)

## Usage

```bash
skill start-dev           # Start all
skill start-dev status    # Check status
skill start-dev restart   # Restart all
skill start-dev stop      # Stop all
skill start-dev attach-backend    # View logs (Ctrl+B D to detach)
skill start-dev attach-frontend   # View logs
```

## Troubleshooting

- **Port conflict**: `skill start-dev stop && skill start-dev start`
- **View logs**: `skill start-dev attach-backend`
- **Kill sessions**: `tmux kill-session -t we-backend`
- **Check ports**: `lsof -ti:3001` or `lsof -ti:5173`
