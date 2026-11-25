#!/usr/bin/env bash
set -euo pipefail

# Opens a GitHub PR from the current branch into develop.
# The body is .ai/pr-description.md when it exists (codee-generate-pr-description writes it),
# otherwise the summaries of the branch's changesets.
# Requires: an origin remote and an authenticated gh CLI.
# The title is the branch's first commit subject, a conventional commit, unless PR_TITLE is set.
# Usage: yarn pr:create   (BASE_BRANCH and PR_TITLE override the defaults)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "Error: the repository has no origin remote." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is required but not found in PATH." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh CLI is not authenticated. Run 'gh auth login'." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ -z "$CURRENT_BRANCH" || "$CURRENT_BRANCH" == "HEAD" ]]; then
  echo "Error: unable to determine the current branch." >&2
  exit 1
fi

BASE_BRANCH="${BASE_BRANCH:-develop}"
FIRST_SUBJECT="$(git log --reverse --format=%s "${BASE_BRANCH}..HEAD" | sed -n 1p)"
PR_TITLE="${PR_TITLE:-${FIRST_SUBJECT}}"
if [[ -z "$PR_TITLE" ]]; then
  echo "Error: the branch has no commit over ${BASE_BRANCH}; set PR_TITLE or commit first." >&2
  exit 1
fi
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

if [[ -f .ai/pr-description.md ]]; then
  cp .ai/pr-description.md "$BODY_FILE"
else
  summaries=()
  while IFS= read -r file; do
    # The first paragraph after the changeset's front matter.
    summary="$(awk '
      /^---$/ { separators++; next }
      separators >= 2 {
        if (out == "" && $0 ~ /[^[:space:]]/) { out = $0; next }
        if (out != "" && $0 ~ /^[[:space:]]*$/) { exit }
        if (out != "") { out = out " " $0 }
      }
      END { print out }
    ' "$file")"
    [[ -n "$summary" ]] && summaries+=("$summary")
  done < <(git diff --name-only --diff-filter=AM "$BASE_BRANCH"...HEAD -- .changeset | grep -E '\.md$' | grep -v 'README\.md$' || true)

  {
    echo "## Summary"
    if [[ ${#summaries[@]} -gt 0 ]]; then
      printf -- "- %s\n" "${summaries[@]}"
    else
      echo "- Describe the change."
    fi
    echo
    echo "## Testing"
    echo "- Describe what was run."
  } > "$BODY_FILE"
fi

gh pr create \
  --base "$BASE_BRANCH" \
  --head "$CURRENT_BRANCH" \
  --title "$PR_TITLE" \
  --body-file "$BODY_FILE"
