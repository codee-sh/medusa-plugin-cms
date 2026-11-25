---
{"title": "git loses the rename of a one-line file whose line changes", "modules": [], "areas": ["tooling", "admin"], "topics": ["tooling"]}
---

# git loses the rename of a one-line file whose line changes

git does not store renames; it guesses them by comparing content, and counts a pair as a rename only
when at least half of it is the same (the default `-M50%`). It compares lines, so a file of one line
whose line changes is 0% the same as before, and `git status` shows it as `D` plus `A`, not `R`, even
after `git mv`.

Seen on 2026-11-10, moving the Admin's component folders without `cms`: each folder's `index.ts` is one
line, `export { CmsDocumentValidation } from "./cms-document-validation"`. Renaming the folder and the
component file inside it in one commit changed that line's path, and fourteen `index.ts` files came out
as deletes and adds, while every other moved file, whose path fixes touched a few lines out of many,
stayed `R`.

Rule: when a move would change the only line of a file - a barrel `index.ts`, a one-line re-export -
split it into two rename-only commits. First move the folders and keep the file names inside them, so
the one-line file stays the same and is detected as `R`; then rename the files inside, where the one-line
file is only modified. Check `git status --short` for `D`/`A` pairs before each commit.
