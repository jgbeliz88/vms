#!/usr/bin/env bash
# PreToolUse hook (Bash): bloquea comandos que tocan PRE/PRO, registries o infra real.
# Ver política en AGENTS.md. Exit 2 = bloquear y devolver el motivo al agente.
cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

# Solo en posición de comando: inicio de línea, o tras ; & | ( $( — opcionalmente vía bash/sh/source/env.
# Sin la comilla invertida: texto Markdown (`kubectl`) en cuerpos de PR/commits daba falsos positivos.
start='(^|[;&|(])[[:space:]]*((sudo|env|bash|sh|zsh|source|\.)[[:space:]]+)*'
bins='(kubectl|az|terraform|vault)([[:space:]]|$)'
other='(docker[[:space:]]+(image[[:space:]]+)?push|make[[:space:]]+(-C[[:space:]]+)?[^[:space:]]*ci/)'
pattern="${start}(${bins}|${other})"

if printf '%s' "$cmd" | grep -Eq "$pattern"; then
  echo "Bloqueado por política (AGENTS.md): este comando toca PRE/PRO, registries o infra real. Propón el comando al humano en lugar de ejecutarlo." >&2
  exit 2
fi
exit 0
