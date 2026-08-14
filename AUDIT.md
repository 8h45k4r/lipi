# Lipi — Full Code Audit

**Date:** 2026-08-14 · **Scope:** entire repo (`src/`, API routes, scripts, config) · **Stack:** Next.js 16.3 (App Router), React 19, Tailwind v4, shadcn/ui, MySQL (`mysql2`), Ollama.

This audit covers three dimensions — **Architecture**, **UI/UX**, and **QA/QC + Security** — and is ordered by severity so it can be burned down during the enhancement phase. Each item is `[SEVERITY]` with `file:line` and a one-line fix.

Tooling snapshot: `tsc --noEmit` → **0 errors** · `eslint` → **123 errors / 52 warnings** · `next build` → **FAILS** · `zod` is a dependency but used in **0 files**.

---

## 0. The two things to understand first

1. **Nothing is actually authenticated.** `auth-context.tsx` is a client-side localStorage mock (any email logs you in as "Demo User"; the login form never reads the password). **All 19 API routes execute with zero identity checks.** For a product handling citizenship certificates, land records, and KYC, this is the defining risk.
2. **There are two disconnected data layers that never reconcile.** `contexts/app-context.tsx` seeds fake projects/documents/pipelines into `localStorage` and all its mutations write only there. A real MySQL backend exists in parallel. The dashboard and workspace read **both** and fall back to the mock — so a fresh, empty database still displays fabricated "8 documents / 98.4% success rate."

---

## 1. CRITICAL

| # | Area | File:Line | Problem | Fix |
|---|------|-----------|---------|-----|
| C1 | Security | `public/uploads/*.pdf` | **74MB of real scanned PII PDFs committed to git** (32MB + 10MB + 32MB), path **not gitignored**. Distributed to every clone/fork, permanently in history. | `git rm --cached`, purge history (BFG/filter-repo), gitignore `public/uploads/`, rotate docs. |
| C2 | Security | all `src/app/api/**/route.ts` | **Zero auth/authorization on every route.** Anyone on the network can read/delete all documents, extractions, projects, team, settings, chat. | Server-side session + `middleware.ts` gate; authorize before every DB access. |
| C3 | Security | `api/upload/route.ts:53`, `api/uploads/[filename]/route.ts` | PII uploads written to **public/** dir and served with **no access control** — guess a `doc_uid`, fetch the raw citizenship/land PDF. | Store outside `public/`; serve only through an authed+authorized route keyed to the user. |
| C4 | Security / Arch | `lib/db.ts:14-16` (+ 16 scripts) | DB credentials hardcoded `root`/`root` (comment: "As requested by blueprint"), duplicated across 18 files, committed. | Env vars / secrets; least-privilege DB user; rotate. |
| C5 | UI | `globals.css:67-68` vs `7-49` | `--success`/`--warning` defined on `:root` but **not registered in `@theme inline`**, so `bg-success`/`text-warning` etc. emit **no CSS** (also absent from `.dark`). Breaks status badges in 5 files. | Add `--color-success`/`--color-warning` to `@theme inline`; define in `.dark`. |
| C6 | UI/a11y | every modal (`documents:230`, `projects:408/467`, `projects/[id]:320/409`, `pipelines:371`, `team:184`, `api-keys:126`) | Raw `fixed inset-0` divs — **no `role="dialog"`, no focus trap, no Escape, no focus return**; background stays focusable. | Extract one shared accessible `<Modal>` (Base UI / shadcn Dialog). |

---

## 2. HIGH

### Architecture
- **[H] Prod DB pool leak.** `lib/db.ts:9-19` — the `production` branch calls `createPool()` on **every** `getDb()` call → connection exhaustion. Only dev caches on `globalThis`. Both branches are otherwise identical. → Single cached pool for all envs.
- **[H] No tenancy/ownership model.** No `user_id`/`org_id` on any table or query; all data is global even after auth is added. → Add owner column, scope every query.
- **[H] Every page is a client component.** All 16 non-root pages start with `"use client"` and fetch via `useEffect`; auth is pushed entirely to the client. → Convert read pages to server components; add `middleware.ts`.
- **[H] `/api/parse` is silently broken.** `api/parse/route.ts:17` selects `id, mime_type, file_name` but reads `doc.ocr_text` (line 26) and `doc.page_count` (28), never selected → always returns empty OCR / pageCount 1. → Add `ocr_text, page_count` to the SELECT.
- **[H] Ollama config hardcoded in 4 places** (`ollama.ts:30`, `chat:48`, `health:23`, `extract:94`) and model **`gemma4:12b` does not exist** (no Gemma 4). Every real call likely fails. → Env-driven client + valid model tag (`gemma2`/`gemma3`).
- **[H] 16 committed one-off DB scripts** (root + `scripts/`), each re-embedding root creds; four overlapping un-versioned "migrations" (`db_migrations` / `_v2` / `_v4`, no v3; `migrate.js` duplicates `_v4`); mixed CJS/ESM; `check-*`/`test-*`/`fix-db` are throwaway. No single schema source of truth, no FKs. → One real migration tool + one seed; delete debris.
- **[H] No `.env`/`.env.example`; only one `process.env` reference in the whole app.** DB, Ollama, model, credit limits all literals; `zod` present but unused → no runtime config validation. → Validated env loader; fail fast at boot.

### Security
- **[H] Client controls the full LLM message array.** `chat/route.ts:16,39-46` spreads `...messages` (incl. attacker `role:"system"`) into the Ollama payload. → Accept only user-role content; build system/history server-side.
- **[H] Prompt injection via document OCR.** `ollama.ts:225-235` & `chat:35` concatenate untrusted `ocrText` straight into prompts — a malicious doc can force false "verified" KYC values. → Delimit/escape OCR; validate model output against schema.
- **[H] Unbounded input to LLM / uploads.** No size cap on `formData`/buffer (`upload:37-47`) or on `fields`/`messages` (`extract:18`, `chat:16`) → DoS / memory / runaway inference cost. → Enforce max sizes before dispatch.
- **[H] Internal error messages leaked to clients.** 16 routes return `{ error: error.message }` verbatim → raw MySQL/driver internals reach the client. → Log server-side, return generic message + id.
- **[H] No upload validation.** `upload:37-54` trusts attacker-controlled `file.type`, derives extension from `file.name`, no allowlist, no magic-byte sniff, no size cap. → Content-sniff MIME allowlist; cap size.

### UI/UX
- **[H] No dark-mode toggle** despite `next-themes` wired (`layout.tsx:25-30`); zero `setTheme` calls in codebase — only reachable via OS settings. → Add a toggle.
- **[H] Header dropdowns inaccessible** (`dashboard-layout.tsx:318-403`) — no click-outside, no Escape, no keyboard, no `aria-expanded`. The unused `ui/dropdown-menu.tsx` already solves this. → Use the primitive.
- **[H] Global search bar is decorative** (`dashboard-layout.tsx:305-312`) — no value/onChange/label/form; notification badge hardcoded `3`. → Wire up or remove; add `aria-label`.
- **[H] Workspace toggles inaccessible** (`workspace:56-58`, `:1082-1108`) — `<div onClick>`, not focusable, no `role="switch"`/`aria-checked`. Settings page does it correctly (`settings:35-49`). → Reuse the Settings `Toggle`.
- **[H] Mobile table overflow** — `team:109`, `api-keys:70`, `billing:56` wrap `<table>` in `overflow-hidden` (should be `overflow-x-auto`). → Wrap in scroll container / adopt `ui/table.tsx`.
- **[H] Signup not responsive** (`signup:29,62,84`) — `grid-cols-2` with no breakpoint stays 2 cramped columns on phones. → `grid-cols-1 sm:grid-cols-2`.
- **[H] Broken 404 "Go Back"** (`not-found.tsx:39`) — `href="javascript:history.back()"` dead under Next `<Link>`/CSP. → `<button onClick={router.back}>`.
- **[H] No i18n & no Devanagari font** in a bilingual product — no i18n lib, `<html lang="en">` hardcoded, all strings English; only Latin `Outfit` loaded, so `लिपि` and all extracted Nepali text fall back to an arbitrary system font. → Add i18n (`next-intl`) + Noto Sans Devanagari / Mukta.

---

## 3. MEDIUM

### Build / correctness
- **[M] `next build` FAILS** — `pdf-parse` required at module top (`upload:7`) pulls `DOMMatrix`/canvas, undefined at build. **Ship-blocker.** → Lazy-`require` inside the handler or add polyfill.
- **[M] `systemPrompt` silently ignored** — `ollama.ts:35` destructures but never uses it; `extract` forwards it for nothing. → Incorporate or remove.
- **[M] Hardcoded `page_count = 11` for every PDF** (`upload:60`); propagates everywhere. → Use `data.numpages`.
- **[M] Dashboard status-casing bug** — `dashboard/route.ts:13` `WHERE status="active"` but stored capitalized → active count never matches, falls back to literal `3`; `successRate=98.2`, `totalCredits=1000000` fabricated. → Normalize casing; derive metrics.
- **[M] `eval/route.ts`** requires `extractionId` but `run-qa-eval.js` sends only `{docId}` (400s); comparison `String(a)===String(b)` (`:34`) → objects become `"[object Object]"`, `null`→`"undefined"`. → Fix contract; deep-compare.
- **[M] Boolean defaults via `||`** — `ollama.ts:158-183` (`summarizeFigures || true` etc.) always yields `true`, ignoring explicit `false`. → Use `??`.

### Data integrity
- **[M] No transactions on multi-write ops** — `upload:63-76` (3 INSERTs), `extract:56-75`, `documents/[id]` DELETE (3 DELETEs), `project-documents:24-30` loop. Partial failure = inconsistent state / orphans. → Wrap in transactions.
- **[M] No foreign keys anywhere**; joins on loose VARCHAR uids; `project_documents` shipped without its UNIQUE (patched post-hoc by `fix-db.js`, which `INSERT IGNORE` already depends on). → Add FKs + constraints in migration.
- **[M] ID-scheme & shape mismatch across layers** — mock `proj_1`/`doc_1` vs real `proj_<uuid>`; mock `Document` has `lang`/`confidence`/`pages`, API stubs `lang:'Nepali'`/`pages:1`. → Kill the mock as a data source.
- **[M] `settings/route.ts:33`** — no key allowlist; arbitrary `section` becomes a row, `data` unvalidated. → Allowlist + validate.

### Type safety / validation
- **[M] `no-explicit-any` epidemic** — 80 lint errors, 26 `as any`; every route does `await req.json()` and destructures untyped input with **no validation** (zod unused). → zod schema per route body; typed DB row interfaces.

### UI/UX
- **[M] God-components** — `workspace/page.tsx` (1220 lines, ~40 `useState`), `dashboard` (634), `settings` (615), `projects` (551). → Extract `<SchemaBuilder>`, `<ParseSettingsPanel>`, `<ResultsPanel>`, `<ReviewMode>`, `<DocumentViewer>`; lift config into a reducer.
- **[M] Form labels not associated** — `login`, `signup`, `forgot-password`, `settings`, all modals use `<label>` with no `htmlFor`/`id`. Unused `ui/label.tsx`+`input.tsx` would fix it. → Pair `htmlFor`/`id`.
- **[M] Duplicated components** — upload modal copy-pasted (`projects:467` ↔ `projects/[id]:320`), search+count bar duplicated 4×, status color logic re-implemented inline (`dashboard:507`) despite `ui/status-badge.tsx`. → Extract shared components.
- **[M] Login never captures password** (`login:67-72`, `handleSubmit:12`), social buttons + signup confirm-field non-functional; api-keys modal discards `permission`/`expiry` on create. → Capture/validate or mark clearly as demo.
- **[M] Dashboard/documents lack real loading/error states** — dashboard renders mock metrics immediately and only `console.error`s failures (`dashboard:141-152,192`); documents has no `isLoading` (`documents:32-42`). → Add skeleton + error toast; don't render placeholders as real.
- **[M] `confirm()` for destructive actions** — `projects:79`, `projects/[id]:130`, `pipelines:80`, `team:67`, `api-keys:46`, `settings:203` — unthemed native dialogs. → Shared confirm dialog.
- **[M] Icon-only buttons use `title` not `aria-label`** (documents/projects/pipelines/api-keys/team); workspace 👍/👎 (`:1185`) have neither. → Add `aria-label`.
- **[M] Metric-card tooltips hover-only / not keyboard-reachable** (`dashboard:339-344`); `TooltipProvider` mounted but unused. → Use the `Tooltip` primitive with a focusable trigger.

---

## 4. LOW

- **[L] Response envelopes inconsistent** — `{documents:[]}` vs bare array (`team:8`) vs `{pipeline:{}}` vs bare `{id,name}`. → One envelope convention.
- **[L] No rate limiting / body-size limits** on any route incl. expensive LLM routes.
- **[L] `set-state-in-effect` (11×)** & `exhaustive-deps` — `auth-context:31`, `app-context:94`; auth redirect can flash protected content.
- **[L] Uncaught `throw` in React tree** — `useAuth()` throws with no error boundary; `getOcrForDoc` 404 surfaces as 500.
- **[L] Hardcoded colors ignoring tokens** — `api-keys:116` `bg-[#111827]`, inline `#003C8D` (`login:21`, `pipelines/[id]:182`), Recharts `stroke="#888888"` (`dashboard:458`), 8 modal overlays mix `bg-black/50`/`bg-background/80`.
- **[L] Logo is a remote `<img>` ×4** (`https://saipals.com/...lipi-logo.svg`) — breaks offline, layout shift, bypasses `next/image`. → Bundle a local `<Logo>`.
- **[L] `--font-mono` maps to a sans font** (`globals.css:11`) — JSON/IDs render proportional. → Load a real monospace.
- **[L] `--radius:0rem` globally** yet primitives use `rounded-xl`/`lg` then pages sprinkle `rounded-none`. → Decide radius system; remove contradictions.
- **[L] `next.config.ts` rewrite** `/uploads/*`→`/api/uploads/*` shadows static serving of the same `public/uploads` files (redundant). → Pick one strategy.
- **[L] Uploads on local `public/` filesystem** — not viable serverless/multi-instance. → Object storage + signed access.

---

## 5. Testing — complete absence

No `*.test.*`/`*.spec.*`, no jest/vitest/playwright config or dependency. `npm run lint` is the only quality script, and it fails. `run-qa-eval.js` / `test-api.js` / `test-db.js` are ad-hoc `console.log` scripts hardcoding one `docId` against `localhost:3000` — **no assertions, not in CI.** → Stand up vitest + an asserting eval harness; add CI.

---

## 6. What's already solid (don't regress these)

- **SQL is consistently parameterized** — no interpolation of user input into any query; injection surface effectively closed.
- `tsc --noEmit` is clean — the `any` issues are lint-level, not compile-breaking.
- Ollama host is fixed/local — no SSRF pivot.
- Good patterns exist and should be the template: `pipelines/page.tsx:99-124` optimistic update with rollback; `settings` Toggle is a correct `role="switch"`; documents/projects/pipelines tables use `overflow-x-auto`+`min-w`+sticky headers; sonner toasts used consistently.

---

## 7. Recommended remediation sequence (for the enhancement phase)

1. **Contain the data leak** — purge PII from git + gitignore uploads (C1); move uploads out of `public/` behind authz (C3, H5); externalize/rotate DB creds (C4).
2. **Real auth** — server session + `middleware.ts` + per-route authorization + tenancy scoping (C2, H tenancy).
3. **Unbreak the build & core flow** — lazy-load pdf-parse (M build); fix `parse` SELECT (H); real `page_count` (M); correct model tag + env-driven Ollama (H).
4. **Kill the dual state** — remove mock fallbacks from dashboard/workspace; make the DB the single source of truth (§0.2).
5. **Harden inputs** — zod on every route body; stop leaking `error.message`; bound LLM inputs; safe message construction (M7, H4, H1–H3); transactions for multi-write ops (M6).
6. **Config & migrations** — validated env loader; replace 16 scripts with one migration + FKs + `.env.example`; delete debris.
7. **UI/UX foundation** — fix `--success`/`--warning` tokens; accessible shared Modal + Dropdown + Toggle from the existing-but-unused primitives; theme toggle; i18n + Devanagari font; decompose `workspace`.
8. **Quality gate** — vitest + asserting eval harness + CI running lint/build/test.
