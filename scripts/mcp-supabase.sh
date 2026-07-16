#!/bin/bash
# Lanza el MCP server de Supabase cargando SUPABASE_ACCESS_TOKEN desde .env.local
# en tiempo de ejecucion (ese archivo esta en .gitignore, nunca se versiona).
# Existe porque .mcp.json no expande ${VAR} — pasa el texto literal al proceso.
set -a
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env.local" 2>/dev/null || true
set +a
exec npx -y @supabase/mcp-server-supabase@latest --project-ref=vtksbnctdrszpodntyfw
