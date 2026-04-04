#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

require_path() {
  local path="$1"
  local message="$2"
  if [[ ! -e "$path" ]]; then
    echo "$message" >&2
    exit 1
  fi
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

require_command npm
require_path "$BACKEND_DIR/.venv" "Missing backend virtualenv at backend/.venv"
require_path "$ROOT_DIR/package.json" "Missing package.json at repository root"
require_path "$FRONTEND_DIR/package.json" "Missing frontend/package.json"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  require_path "$BACKEND_DIR/.env.example" "Missing backend/.env.example"
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "Created backend/.env from backend/.env.example"
fi

cd "$ROOT_DIR"
exec npm run dev
