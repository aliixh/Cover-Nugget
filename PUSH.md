# Push cheat-sheet

The assistant commits locally; **you push from your Mac** (this repo's box has no
GitHub credentials by design).

Remote: `origin https://github.com/aliixh/Cover-Nugget.git` · Branch: `main`

## Normal flow
```bash
cnpull                       # rsync the latest files to your Mac
cd <path>/side-project
git status                   # see what git thinks changed
```

- **"nothing to commit, working tree clean"** → just push:
  ```bash
  git push
  ```
- **Files show as modified/untracked** (cnpull copies files, not git history) →
  commit them, then push:
  ```bash
  git add -A
  git commit -m "sync latest"
  git push
  ```

## First-time / troubleshooting
- **Login prompt:** use your GitHub **username + a Personal Access Token** (not
  your account password).
- **Rejected** ("updates were rejected" / "unrelated histories") — the remote has
  an old starter commit; overwrite it once (safe on your own fresh repo):
  ```bash
  git push -u origin main --force-with-lease
  ```
- **"not a git repository"** — `cnpull` didn't copy the hidden `.git/` folder. Ask
  the assistant to bundle the repo, or make sure your rsync includes dotfiles.

## Uploading a file via the GitHub website (e.g. an image)
Open the repo → into the folder → **Add file ▸ Upload files** → drag it in →
**Commit changes**. Then run `cnpull`… actually the reverse: run `git pull` on
your Mac afterward so local stays in sync.
