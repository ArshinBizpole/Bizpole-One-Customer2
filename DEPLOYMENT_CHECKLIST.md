# Bizpole One — Customer Portal: Deployment Checklist

Repo: `Bizpole-One-Customer2` · Host: Azure Static Web Apps
(`agreeable-smoke-083005100`) · Pipeline:
`.github/workflows/azure-static-web-apps-agreeable-smoke-083005100.yml`

**How this deploys:** any push to `main` triggers the SWA workflow, which runs
`npm run build` on a clean checkout and uploads `dist/`. There is **no env-var
injection step in the workflow**, so the committed `.env` file *is* the
production build configuration. Whatever is in `.env` at merge time is what
ships, baked into the JS bundle.

---

## 0. Blockers — must be cleared before any push to `main`

These were verified against a real `npm run build` on 2026-09-19. The bundle
was inspected after building; the leaked values are confirmed present.

- [ ] **`VITE_API_BASE_URL` is not set at all.** Every one of the five
      definitions in `.env` is commented out. The build therefore falls back to
      `http://localhost:5000/api` in `src/api/CustomerApi.js:15` and to
      `undefined` in `src/api/axiosInstance.js`. Confirmed in the built bundle
      (`http://localhost:5000`). **The deployed portal will not reach the API
      at all.** Uncomment the production line:
      `https://bizpole-one-server-production-f7hrbnhxc7e6gxep.eastasia-01.azurewebsites.net`
      (or `https://api.bizpoleindia.in`) — confirm which of the two is the live
      API host before choosing.
- [ ] **`VITE_URL=http://localhost:5173/` is the active value.** Used by
      `src/pages/AssociateProfile.jsx:11`; confirmed in the bundle. Set it to
      the production customer-portal URL.
- [ ] **`VITE_CLIENT_BASE_URL=https://dev.bizpoleindia.in` points at DEV.**
      This builds every quote-preview / saved-quote link customers click
      (`ComplianceDashboard`, `QuotesList`, `DashboardLayout`, `MyOrderDetails`,
      `Services`, `AssociateQuotes`). 5 occurrences confirmed in the bundle.
      Customers would be sent to the dev CRM. Point it at the production CRM
      host.
- [ ] **`.env` is tracked in git and contains secrets.**
      `VITE_QUOTE_LINK_SECRET` and `VITE_ENCRYPTION_KEY` are committed and are
      compiled into the public JS bundle (verified — the literal secret string
      appears in `dist/assets/index-*.js`).
      - Short term: accept it (any `VITE_*` value is public by design in a
        static SPA) but stop treating these as secrets — anyone can read them
        and forge/decrypt quote links.
      - Correct fix: move quote-link signing and payload encryption server-side
        and have the portal request a signed URL from the API.
      - Note the same fallback secret is also **hardcoded in six source files**
        (`q3!9fKs7@...`), so removing it from `.env` alone changes nothing.
- [ ] **Local `main` is stale.** Local `main` is at `93c543d`; `origin/main` and
      the current `SupportTicket` branch are both at `18c06c9`. Deploy from
      `origin/main`, not from a local checkout of `main`.

---

## 1. Pre-deploy — code & branch

- [ ] Confirm the release commit. `SupportTicket` is currently identical to
      `origin/main` (0 commits ahead, 0 unpushed) — i.e. PR #43 is already
      merged, so **`origin/main` already contains everything and a re-run of
      the workflow will deploy it.**
- [ ] `git fetch --all` and re-verify `origin/main` hasn't moved since this
      checklist was written.
- [ ] Working tree clean (`git status --short` empty).
- [ ] `npm ci` (not `npm install`) locally to match the CI lockfile install.
- [ ] `npm run build` passes locally. Currently: **passes** — 0 ESLint errors,
      62 warnings, built in ~30s.
      Note `build` runs `check-unused` (ESLint) first, so a new *error*-level
      lint violation will fail the deploy, not just warn.
- [ ] Grep the built bundle for stragglers before shipping:
      `grep -o "http://localhost:[0-9]*" dist/assets/*.js` — must return nothing.
- [ ] 90 `console.log` calls remain in `src/`. Not a blocker, but they will run
      in production; strip any that print customer data, tokens, or payloads.

## 2. Pre-deploy — backend & data

The customer portal is a thin client over `Bizpole-One-Server`. Deploy the
server **first**, and note that several pending server changes carry
migration-ordering constraints:

- [ ] Confirm the API build the portal will talk to is already live and
      healthy, and that its version includes every endpoint this release calls.
- [ ] **Login-attempt limiting:** its DB migration MUST run on the live
      database *before* the server code deploys — the unconditional `UPDATE`
      would 500 every login otherwise.
- [ ] **Constitution form filtering** and **recurring services (2 migrations)**:
      migrations run before code deploy.
- [ ] Any new permission (e.g. Finance/Invoices, document-verification
      View/Download/VerifyCompletion) must be **granted to the relevant roles
      before** deploy, or those screens 403 on first use.
- [ ] Take a DB backup / note the restore point before running any migration.

## 3. Deploy

- [ ] Merge / confirm on `main` → the SWA workflow runs automatically.
- [ ] Watch the GitHub Actions run to green (build + upload).
- [ ] If deploying via a PR, note the workflow also publishes a **preview
      environment** per PR — use it for smoke-testing before merge.

## 4. Post-deploy smoke test (production URL, hard refresh / incognito)

- [ ] Open DevTools → Network: confirm XHRs go to the **production API host**,
      not `localhost:5000`.
- [ ] Customer login + OTP flow.
- [ ] Session behaviour: a 401/403 with a stored token clears the session and
      redirects to `/` (`axiosInstance` auth interceptor); an unauthenticated
      failed login shows a normal error, no redirect.
- [ ] Deep-link / refresh on a nested route (e.g. `/my-orders/123`) — confirms
      the SWA `navigationFallback` rewrite is serving `index.html`.
- [ ] Dashboard loads: orders, services, quotes, compliance widgets.
- [ ] **Quote preview link** opens against the *production* CRM host, not
      `dev.bizpoleindia.in`.
- [ ] Invoice preview + PDF download (`jspdf` / `html2canvas` paths).
- [ ] Associate area: companies, customers, deals, quotes lists.
- [ ] Support ticket flow (the feature merged in PR #43) end-to-end: create,
      list, view.
- [ ] Mobile width (~400px) — the portal is customer-facing.

## 5. Rollback

- [ ] Rollback = revert the merge commit on `main` and let the workflow
      redeploy; SWA keeps no one-click previous version for this setup.
- [ ] Record the last-known-good commit SHA before deploying so the revert
      target is unambiguous.
- [ ] If a DB migration ran, rolling back the frontend alone will **not** undo
      it — plan the down-migration separately.

## 6. Known non-blocking issues to log, not fix now

- [ ] Main bundle is **2.46 MB** (699 kB gzipped) with no code-splitting.
      First load on mobile data will be slow. Candidate for `manualChunks` /
      dynamic `import()` of `jspdf`, `html2canvas`, `recharts`.
- [ ] `staticwebapp.config.json` sets no cache-control headers. If a
      build-id/`version.json` update prompt is ever added here (as on the CRM
      client), SWA's default caching is the known silent-failure point and a
      `no-store` header on that file will be required.
- [ ] `vercel.json` and the ngrok/vercel entries in `vite.config.js`
      `allowedHosts` are leftovers from a previous Vercel deployment — dead
      config worth removing.
