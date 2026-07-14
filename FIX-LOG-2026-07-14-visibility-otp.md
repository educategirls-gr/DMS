# Fix Log — 2026-07-14: Document Visibility + OTP Login Outage

## Reported issue
Alok Mohan (`alok.mohan@educategirls.ngo`, role `it_admin`) uploaded documents that
did not show up in "All Documents" for other users (specifically Aditya Pratap Singh,
`team_lead`). Aditya's own uploads showed up fine.

## Root causes found (three, unrelated, stacked on top of each other)

### 1. Documents sheet was missing `state` / `target_component` columns
`appendRow()` in `src/utils/SheetManager.gs` only writes object keys that match an
**existing** header in the sheet. `uploadDocument()` (`src/modules/Upload.gs`) has
always sent a computed `state` value (e.g. `'ALL'`, `'MANAGERS:UP'`) meant to drive
`isVisible()`'s audience-matching, but the Documents sheet never actually had `state`
or `target_component` columns — so every document was saved with `state` silently
blank. `matchesAudience('')` always returns `false`, which broke visibility for any
viewer whose role falls through to the audience-match branch (`team_lead`,
`state_lead`, `project_manager`) — but not for plain `manager` viewers, who are
gated on `status` only. This is why the bug looked role-specific.

**Fix:** `fixDocumentsStateColumn()` (`src/utils/Debug.gs`) — adds the missing
columns and backfills `state` on existing rows using the same role-based logic
`uploadDocument()` uses for new uploads. Already run once against the live sheet.

### 2. Local git checkout was 10 commits behind GitHub, and the live site pins a specific GAS deployment ID
`dms.dataimpact.in` is a static `index.html` (repo root) served via GitHub Pages
(see `CNAME`). It calls the backend through a hardcoded `GAS_URL` — a specific,
pinned Apps Script **deployment ID** — not `@HEAD`. `clasp push` only updates
`@HEAD`; it does not touch what's actually live.

Local `index.html` referenced a different (stale/unused) deployment ID than what
GitHub's `index.html` referenced. An early `clasp push --force` in this session
pushed *stale local code* to `@HEAD`, and a `clasp deploy` targeted the *wrong*
deployment ID — a silent no-op for real users, and it briefly regressed an OTP
expiry parsing fix that already existed upstream on GitHub.

**Fix:** pulled and merged the 10 upstream commits, re-pushed the merged code,
then deployed to the deployment ID `index.html`'s `GAS_URL` actually calls
(`AKfycbyDNIKot...`). Full writeup of the architecture now lives in `CLAUDE.md`
under "Deployment Architecture — Read Before Redeploying".

### 3. Trailing whitespace in the Users sheet `role` column
Aditya's `role` cell was `"team_lead  "` (two trailing spaces). Login response
(`src/auth/Login.gs`) returns `user.role` raw, and the frontend
(`src/ui/Index.html`, `buildSidebar()` and others) does
`(SESSION.role||'').toLowerCase()` — **without `.trim()`** — before checking
`['team_lead','it_admin'].includes(role)`. The trailing spaces made the check fail,
silently hiding the "Verify Documents" tab for Aditya only (Alok's role had no
stray whitespace, so his session wasn't affected).

**Fix:** `trimUserRoles()` (`src/utils/Debug.gs`) — trims the `role` column for
all Users rows. Already run once. (The frontend's missing `.trim()` is still a
latent fragility — any future stray whitespace in a role cell will reproduce this
silently. Worth hardening in `Index.html` / `Login.gs` if it recurs.)

## Incident during the fix: system-wide OTP login failure
While chasing root cause #2, a deploy briefly went out on the *wrong* deployment
ID, which turned out to be harmless (unused), but the subsequent *correct* redeploy
coincided with a report of "Invalid or expired OTP" failing for every account.
Rolled back immediately via `clasp deploy -i <id> -V 6` to the last-known-good
version to restore login, then re-verified: the sheet-level fixes (#1, #3) are
independent of which code version is deployed, so the rollback did not undo them.
Root cause of the OTP report was never conclusively pinned down (login-relevant
code was identical between v6 and v8); most likely a stale/reused OTP during
testing, not a real regression. Current live deployment is v6.

## Current state (verified working)
- Alok's documents visible to Aditya in "All Documents" ✅
- Aditya sees "Verify Documents" tab ✅
- OTP login works ✅
- Local git and `origin/main` are in sync ✅
- `gh` CLI installed on this machine (previous git push credential helper was
  broken — pointed at a `gh.exe` path that didn't exist)
