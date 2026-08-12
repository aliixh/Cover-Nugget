# Push cheat-sheet

The box **pushes directly** to GitHub. A Personal Access Token lives in
`~/.git-credentials` (consumed via `git config credential.helper store`), so there's
**no Mac round-trip and no `cnpull`** — commit and push straight from the box.

Remote: `origin https://github.com/aliixh/Cover-Nugget.git` · Branch: `main`

## Normal flow
```bash
cd <path>/side-project
git add -A
git commit -m "…"            # author: aliixh <aliixhuang@gmail.com>
git push origin main
```
Afterward `git status` should read `working tree clean` and
`up to date with 'origin/main'`. The user runs `git pull` on their Mac to sync.

## Troubleshooting
- **Login prompt / auth fails:** the credential helper isn't set, or the PAT is
  missing/expired. Set it with `git config --local credential.helper store` so git
  reads `~/.git-credentials`, or refresh the token (GitHub **username + a Personal
  Access Token**, never the account password).
- **Rejected (`updates were rejected` / non-fast-forward):** the remote moved.
  `git fetch origin`, then rebase/reset onto it and push again. Only overwrite with
  `git push --force-with-lease` when you're certain what you'd replace.
- **Unrelated histories:** if the box's clone and `origin/main` diverged (e.g. a
  force push replaced remote history), adopt the remote and re-apply your files:
  ```bash
  git fetch origin
  git checkout -B main origin/main   # adopt the real history
  # copy your changed files back on top, then:
  git add -A && git commit -m "…" && git push origin main
  ```
- **`MEMORY.md` never commits:** it's gitignored on purpose (privacy) — local only.

## Guardrails (do not relax)
- **Never** act in the **kyleshu** or **fluxion** accounts.
- **No force-push over shared history** without first checking what you'd overwrite;
  prefer `--force-with-lease`.
- Owner: GitHub `aliixh` · **aliixhuang@gmail.com**.
