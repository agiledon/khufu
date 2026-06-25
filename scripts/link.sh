#!/usr/bin/env bash
set -euo pipefail

# khufu local development setup — creates symlinks so Claude Code
# loads skills directly from the source tree. Run once after clone.
#
# Usage: bash scripts/link.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_SRC="$ROOT/skills"
CLAUDIE_SKILLS="$ROOT/.claude/skills"

echo "==> Setting up khufu for local development..."
echo "    Root: $ROOT"

# 1. Symlink _shared/ at project root so skill references resolve
#    Skills say "Read _shared/mode-selection.md" — that path must
#    be valid from the project root (Claude Code's working dir).
if [ -L "$ROOT/_shared" ] || [ -d "$ROOT/_shared" ]; then
  echo "    _shared already exists — skipping"
else
  ln -s "skills/_shared" "$ROOT/_shared"
  echo "    _shared -> skills/_shared"
fi

# 2. Symlink each skill into .claude/skills/
mkdir -p "$CLAUDIE_SKILLS"

for skill in khufu-ut khufu-it khufu-api khufu-e2e; do
  target="$CLAUDIE_SKILLS/$skill"
  src="$SKILLS_SRC/$skill"

  if [ ! -d "$src" ]; then
    echo "    WARNING: $src not found — skipping $skill"
    continue
  fi

  if [ -L "$target" ]; then
    # Already a symlink — update it
    rm "$target"
  elif [ -d "$target" ]; then
    # Stale copy — remove it
    rm -rf "$target"
  fi

  ln -s "$src" "$target"
  echo "    .claude/skills/$skill -> skills/$skill"
done

echo "==> Done. Edit files under skills/ and changes are live immediately."
