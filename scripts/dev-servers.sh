#!/bin/bash
# Development servers management script for WealthCraft

SESSION_BACKEND="we-backend"
SESSION_FRONTEND="we-frontend"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if a tmux session exists
session_exists() {
    tmux has-session -t "$1" 2>/dev/null
    return $?
}

# Start backend server
start_backend() {
    if session_exists "$SESSION_BACKEND"; then
        log_warning "Backend session already running"
        return 0
    fi

    log_info "Starting backend server..."
    cd "$PROJECT_DIR/app" || exit 1

    tmux new-session -d -s "$SESSION_BACKEND" -n "backend"
    tmux send-keys -t "$SESSION_BACKEND" "cd '$PROJECT_DIR/app'" C-m
    tmux send-keys -t "$SESSION_BACKEND" "npm run dev" C-m

    log_success "Backend server started in tmux session: $SESSION_BACKEND"
}

# Start frontend server
start_frontend() {
    if session_exists "$SESSION_FRONTEND"; then
        log_warning "Frontend session already running"
        return 0
    fi

    log_info "Starting frontend server..."
    cd "$PROJECT_DIR/web" || exit 1

    tmux new-session -d -s "$SESSION_FRONTEND" -n "frontend"
    tmux send-keys -t "$SESSION_FRONTEND" "cd '$PROJECT_DIR/web'" C-m
    tmux send-keys -t "$SESSION_FRONTEND" "npm run dev" C-m

    log_success "Frontend server started in tmux session: $SESSION_FRONTEND"
}

# Stop backend server
stop_backend() {
    if ! session_exists "$SESSION_BACKEND"; then
        log_warning "Backend session not running"
        return 0
    fi

    log_info "Stopping backend server..."
    tmux kill-session -t "$SESSION_BACKEND" 2>/dev/null
    log_success "Backend server stopped"
}

# Stop frontend server
stop_frontend() {
    if ! session_exists "$SESSION_FRONTEND"; then
        log_warning "Frontend session not running"
        return 0
    fi

    log_info "Stopping frontend server..."
    tmux kill-session -t "$SESSION_FRONTEND" 2>/dev/null
    log_success "Frontend server stopped"
}

# Show status
show_status() {
    echo ""
    echo "=== WealthCraft Development Servers Status ==="
    echo ""

    if session_exists "$SESSION_BACKEND"; then
        echo -e "${GREEN}●${NC} Backend  ($SESSION_BACKEND) - ${GREEN}Running${NC}"
        echo "  URL: http://localhost:3001"
    else
        echo -e "${RED}○${NC} Backend  ($SESSION_BACKEND) - ${RED}Stopped${NC}"
    fi

    if session_exists "$SESSION_FRONTEND"; then
        echo -e "${GREEN}●${NC} Frontend ($SESSION_FRONTEND) - ${GREEN}Running${NC}"
        echo "  URL: http://localhost:5173"
    else
        echo -e "${RED}○${NC} Frontend ($SESSION_FRONTEND) - ${RED}Stopped${NC}"
    fi

    echo ""
}

# Attach to backend session
attach_backend() {
    if ! session_exists "$SESSION_BACKEND"; then
        log_error "Backend session not running. Start it with: $0 start"
        return 1
    fi

    log_info "Attaching to backend session... (Ctrl+B then D to detach)"
    tmux attach-session -t "$SESSION_BACKEND"
}

# Attach to frontend session
attach_frontend() {
    if ! session_exists "$SESSION_FRONTEND"; then
        log_error "Frontend session not running. Start it with: $0 start"
        return 1
    fi

    log_info "Attaching to frontend session... (Ctrl+B then D to detach)"
    tmux attach-session -t "$SESSION_FRONTEND"
}

# Main action dispatcher
case "${1:-start}" in
    start)
        log_info "Starting WealthCraft development servers..."
        start_backend
        sleep 2
        start_frontend
        echo ""
        show_status
        echo ""
        log_info "Servers are running in background tmux sessions"
        log_info "Use '$0 attach-backend' or '$0 attach-frontend' to view logs"
        log_info "Use '$0 stop' to stop all servers"
        ;;
    stop)
        log_info "Stopping WealthCraft development servers..."
        stop_backend
        stop_frontend
        log_success "All servers stopped"
        ;;
    restart)
        log_info "Restarting WealthCraft development servers..."
        stop_backend
        stop_frontend
        sleep 1
        start_backend
        sleep 2
        start_frontend
        show_status
        ;;
    status)
        show_status
        ;;
    attach-backend)
        attach_backend
        ;;
    attach-frontend)
        attach_frontend
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|attach-backend|attach-frontend}"
        echo ""
        echo "Commands:"
        echo "  start           Start all servers"
        echo "  stop            Stop all servers"
        echo "  restart         Restart all servers"
        echo "  status          Show server status"
        echo "  attach-backend  Attach to backend session (Ctrl+B then D to detach)"
        echo "  attach-frontend Attach to frontend session (Ctrl+B then D to detach)"
        exit 1
        ;;
esac
