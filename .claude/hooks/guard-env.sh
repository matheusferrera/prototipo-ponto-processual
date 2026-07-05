#!/usr/bin/env bash
# PreToolUse (Read|Edit|Write|Bash): bloqueia acesso a arquivos .env com segredos.
# Permite .env.example / .env.sample / .env.template.
# No Bash, cobre também `cat .env`, `grep ... .env`, redirects etc.
set -euo pipefail

input="$(cat)"

deny() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

tool="$(jq -r '.tool_name // empty' <<<"$input")"

if [ "$tool" = "Bash" ]; then
  cmd="$(jq -r '.tool_input.command // empty' <<<"$input")"
  [ -z "$cmd" ] && exit 0
  # Remove as variantes permitidas e procura por qualquer .env restante (token isolado)
  stripped="$(printf '%s' "$cmd" | sed -E 's/\.env\.(example|sample|template)//g')"
  if printf '%s' "$stripped" | grep -Eq '(^|[^A-Za-z0-9_])\.env([^A-Za-z0-9_]|$)'; then
    deny "Comando referencia arquivo .env (contém segredos) — bloqueado por hook. Use .env.example para referência de variáveis."
  fi
  exit 0
fi

f="$(jq -r '.tool_input.file_path // empty' <<<"$input")"
[ -z "$f" ] && exit 0

base="$(basename "$f")"
case "$base" in
  .env.example|.env.sample|.env.template) exit 0 ;;
  .env|.env.*)
    deny "Arquivo .env contém segredos — leitura/escrita bloqueada por hook. Use .env.example para referência de variáveis."
    ;;
esac
exit 0
