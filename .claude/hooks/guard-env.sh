#!/usr/bin/env bash
# PreToolUse (Read|Edit|Write): bloqueia acesso a arquivos .env com segredos.
# Permite .env.example / .env.sample / .env.template.
set -euo pipefail

f="$(jq -r '.tool_input.file_path // empty')"
[ -z "$f" ] && exit 0

base="$(basename "$f")"
case "$base" in
  .env.example|.env.sample|.env.template) exit 0 ;;
  .env|.env.*)
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Arquivo .env contém segredos — leitura/escrita bloqueada por hook. Use .env.example para referência de variáveis."
      }
    }'
    ;;
esac
exit 0
