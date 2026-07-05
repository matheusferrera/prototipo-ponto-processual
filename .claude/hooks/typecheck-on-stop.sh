#!/usr/bin/env bash
# Stop: roda `npm run typecheck` (tsc --noEmit). Se falhar, bloqueia o encerramento
# e devolve os erros para o Claude corrigir antes de parar.
# Deriva o diretório do projeto a partir da própria localização do script
# (.claude/hooks/ -> raiz do back), robusto ao cwd do monorepo.
set -uo pipefail

# Evita loop infinito: se já estamos retomando por causa deste hook, não bloqueie de novo.
active="$(jq -r '.stop_hook_active // false' 2>/dev/null || echo false)"
[ "$active" = "true" ] && exit 0

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$project_dir" || exit 0

out="$(npm run typecheck 2>&1)"
status=$?
if [ "$status" -ne 0 ]; then
  errs="$(printf '%s' "$out" | grep -E 'error TS|\.tsx?\(' | head -30)"
  [ -z "$errs" ] && errs="$(printf '%s' "$out" | tail -30)"
  jq -n --arg e "$errs" '{
    decision: "block",
    reason: ("typecheck (tsc --noEmit) falhou — corrija antes de encerrar:\n" + $e)
  }'
fi
exit 0
