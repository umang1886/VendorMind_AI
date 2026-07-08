# VendorMind AI — Implementation Guide

**Purpose of this file:** A step-by-step, phase-by-phase build plan so an AI coding agent (or a developer) can implement VendorMind AI in order, without ambiguity, without skipping dependencies, and without rework. Always read `prd.md` (what/why) and `solution.md` (architecture/schema) alongside this file — this file is the **sequence**, not the spec.

**Golden rule for the agent building this: complete each phase fully (including a manual smoke test) before starting the next phase. Do not jump ahead.**

---

## Phase 0 — Project Setup

1. Initialize monorepo (or two repos) structure:
   ```
   vendormind-ai/
   ├── backend/        # FastAPI
   ├── frontend/        # React + Tailwind
   └── docs/            # prd.md, solution.md, implementation_guide.md
   ```
2. Backend: set up FastAPI project skeleton, virtual environment, `requirements.txt` (fastapi, uvicorn, sqlalchemy, psycopg2/asyncpg, pydantic, python-jose or authlib, google-api-python-client, chromadb, groq, python-multipart, jinja2, apscheduler).
3. Frontend: set up React app (Vite recommended) + Tailwind CSS configured.
4. Set up PostgreSQL instance (local Docker for dev, Railway for prod).
5. Set up environment variable files (`.env`) for both backend and frontend — never hardcode secrets. Required vars: `DATABASE_URL`, `GROQ_API_KEY`, `GMAIL_CLIENT_ID/SECRET`, `SUPABASE_URL/KEY`, `JWT_SECRET`, `CHROMA_DB_PATH_OR_URL`.
6. Set up basic CI check (lint + run tests) — optional but recommended.

**✅ Phase 0 done when:** backend runs `uvicorn main:app --reload` and returns a health-check `200 OK`; frontend runs `npm run dev` and shows a blank Tailwind-styled page.

---

## Phase 1 — Database & Auth Foundation

1. Implement the full schema from `solution.md` §3 using SQLAlchemy models + Alembic migrations: `companies`, `users`, `vendors`, `rfqs`, `rfq_vendors`, `quotations`, `ai_recommendations`, `purchase_orders`, `vendor_ratings`.
2. Implement `POST /auth/register` and `POST /auth/login` (JWT-based sessions).
3. Implement role-based access control middleware (`admin` vs `manager`).
4. Build minimal frontend login/register pages.

**✅ Phase 1 done when:** a Company Admin can register, log in, and receive a valid JWT; a Procurement Manager account can be created under that company.

---

## Phase 2 — Vendor Directory (Company Admin)

1. Backend: `GET/POST/PUT /vendors` endpoints.
2. Frontend: Vendor directory page — list, add, edit vendors (name, email, contact info).
3. `trust_score` field defaults to `null`/neutral until the vendor has history.

**✅ Phase 2 done when:** Admin can add and view vendors in the UI, persisted in Postgres.

---

## Phase 3 — RFQ Creation & Vendor Invitation

1. Backend: `POST /rfqs` (create RFQ as draft), `GET /rfqs`, `GET /rfqs/{id}`.
2. Backend: `POST /rfqs/{id}/invite-vendors` — creates `rfq_vendors` rows with a securely generated, signed token per vendor (see `solution.md` §7 for token security requirements) and a `token_expires_at` matching the RFQ deadline.
3. Frontend: RFQ creation form (product, quantity, specs, delivery, warranty, deadline) + vendor multi-select.

**✅ Phase 3 done when:** Manager can create an RFQ, select vendors, and see `rfq_vendors` rows created in the DB with valid tokens (email sending comes in Phase 4).

---

## Phase 4 — Gmail API Integration (Send RFQ)

1. Set up Gmail API OAuth2 credentials and a reusable `email_service` module.
2. Build Jinja2 email templates: RFQ invitation, reminder, confirmation, rejection, purchase order delivery.
3. Backend: `POST /rfqs/{id}/send` — triggers personalized RFQ invitation emails to all invited vendors via Gmail API, updates `rfq_vendors.status` to `invited`.
4. Background job (APScheduler): checks for RFQs nearing deadline with un-submitted vendors → sends reminder emails; checks for RFQs past deadline → marks `rfq_vendors.status` as `expired` and `rfqs.status` as `closed`.

**✅ Phase 4 done when:** clicking "Send RFQ" in the UI results in a real (or sandboxed test) email being sent with a working unique link per vendor, and the background job correctly expires submissions after the deadline.

---

## Phase 5 — Vendor-Facing Quotation Form (Public, No Login)

1. Backend: `GET /public/quotation/{token}` — validates token (not expired, not already submitted), returns RFQ details for display.
2. Backend: `POST /public/quotation/{token}/submit` — accepts price, delivery timeline, warranty terms, payment terms, notes, and a file upload (stored in Supabase Storage) → creates a `quotations` row, marks `rfq_vendors.status` as `submitted`.
3. Frontend: standalone, no-auth-required quotation form page (route like `/quote/:token`), mobile-friendly.

**✅ Phase 5 done when:** opening a generated link in an incognito browser shows the RFQ details, and a vendor can successfully submit a quotation with a file upload, visible in Postgres + Supabase Storage.

---

## Phase 6 — AI Extraction Pipeline (cascadeflow + Groq)

1. Build the `ai_router` module described in `solution.md` §5 — a single `run_ai_task(task_type, payload)` function that selects the Groq model tier per task type.
2. Implement extraction task: parse each `quotations` row (+ uploaded document, if applicable) into structured fields (price, delivery, warranty, payment terms, contract clauses) → store in `quotations.ai_extracted_data`.
3. Implement contract risk analysis task: flag risky clauses → store in `quotations.ai_risk_flags`.
4. Trigger extraction automatically right after a vendor submits (end of Phase 5's submit endpoint), or via an internal `POST /rfqs/{id}/ai/extract` endpoint for reprocessing.

**✅ Phase 6 done when:** every submitted quotation automatically gets structured `ai_extracted_data` and `ai_risk_flags` populated within a reasonable time after submission.

---

## Phase 7 — Hindsight Memory Integration

1. Set up ChromaDB collection(s) for semantic vendor history (negotiation notes, risk flags, free-text rating comments), keyed by `vendor_id`.
2. Build `hindsight_service`: `store_event(vendor_id, event_type, content)` and `retrieve_context(vendor_id, query)`.
3. Build `trust_score_service` implementing the weighted formula from `solution.md` §4, reading from `vendor_ratings` + prior quotations.
4. Backfill: on Phase 7 completion, no vendors will yet have ratings — this phase just needs to be wired and tested with dummy data; real data starts flowing from Phase 10 onward.

**✅ Phase 7 done when:** you can manually insert a test rating + a test ChromaDB entry for a vendor and successfully retrieve both back through the service functions.

---

## Phase 8 — AI Comparison & Recommendation

1. Implement comparison task: normalize all `quotations` for an RFQ into a single comparison table (price, delivery, warranty, payment terms, risk flags side by side).
2. Implement recommendation task: rank vendors, pull in `hindsight_service.retrieve_context` + `trust_score_service` for any vendor with history, and generate a natural-language justification + negotiation suggestions via Groq (complex-task tier).
3. Store results in `ai_recommendations`.
4. Backend: `POST /rfqs/{id}/ai/compare`, `POST /rfqs/{id}/ai/recommend` (or combine into one trigger after all submissions are in / deadline passes).
5. Frontend: comparison table view + AI recommendation panel with reasoning displayed to the manager.

**✅ Phase 8 done when:** after all vendors submit (or deadline passes), the manager can view a full comparison table and a clear AI-recommended vendor with reasoning in the UI.

---

## Phase 9 — Approval Workflow & Purchase Order

1. Backend: `POST /rfqs/{id}/approve` (select a vendor — recommended or override), `POST /rfqs/{id}/reject`, `POST /rfqs/{id}/negotiate`.
2. On approval: trigger confirmation email to the selected vendor and rejection emails to all others (via `email_service` from Phase 4).
3. Backend: `POST /rfqs/{id}/purchase-order` — auto-generates a PO document (PDF) from the agreed terms, stores it in Supabase Storage, creates a `purchase_orders` row, and emails it to the vendor.
4. Frontend: Approve/Reject/Negotiate buttons on the comparison view; PO download/view link once generated.

**✅ Phase 9 done when:** a manager can approve a vendor from the UI, see confirmation/rejection emails go out, and a PO PDF gets generated and stored.

---

## Phase 10 — Vendor Rating & Trust Score Update (Close the Loop)

1. Backend: `POST /rfqs/{id}/rate-vendor` — accepts delivery/quality/communication/support scores + comments, creates a `vendor_ratings` row.
2. Trigger `trust_score_service` to recalculate `vendors.trust_score` immediately after a new rating.
3. Trigger `hindsight_service.store_event` to persist the rating (numeric to Postgres, free-text comments to ChromaDB) for future retrieval.
4. Frontend: "Rate Vendor" form, shown once an RFQ's PO is marked delivered.

**✅ Phase 10 done when:** submitting a rating updates the vendor's trust score visibly in the vendor directory, and that vendor's history shows up correctly when a *new* RFQ is created and Phase 8's recommendation engine references it.

---

## Phase 11 — Dashboard

1. Backend: `GET /dashboard` — aggregates total RFQs, vendor status breakdown, submitted quotations count, recent comparisons, vendor trust scores, risk report summary, procurement savings estimate, vendor history links.
2. Backend: `GET /vendors/{id}/history` — full history for a single vendor (past RFQs, ratings, trust score trend).
3. Frontend: Dashboard page with all of the above, using charts/tables as appropriate.

**✅ Phase 11 done when:** Admin/Manager dashboard shows a live, accurate summary of all procurement activity described in `prd.md` §5.7.

---

## Phase 12 — Polish, Security Review, Deployment

1. Security pass: confirm token security (§7 of `solution.md`), RBAC on every endpoint, input validation on public (no-auth) endpoints especially.
2. Add logging/auditability for every email sent, every AI call (which model tier used, cost), every approval decision.
3. Deploy backend to Railway (with Postgres add-on + background worker), frontend to Vercel, configure production environment variables.
4. Full end-to-end smoke test: create RFQ → invite vendors → submit quotations → AI recommendation → approve → PO generated → rate vendor → trust score updates → dashboard reflects everything.

**✅ Phase 12 done when:** the full workflow in `solution.md` §2 runs end-to-end in the deployed production environment without manual intervention.

---

## Build Order Summary (Quick Reference)

| Phase | Deliverable |
|---|---|
| 0 | Project scaffolding |
| 1 | DB schema + auth |
| 2 | Vendor directory |
| 3 | RFQ creation + invitation tokens |
| 4 | Gmail sending + reminders + auto-expiry |
| 5 | Public vendor quotation form |
| 6 | AI extraction + risk analysis (cascadeflow) |
| 7 | Hindsight memory (ChromaDB + trust score service) |
| 8 | AI comparison + recommendation |
| 9 | Approval workflow + Purchase Order |
| 10 | Vendor rating → trust score update loop |
| 11 | Dashboard |
| 12 | Security, polish, deployment |

**Note to the coding agent:** Do not implement AI comparison/recommendation (Phase 8) before the extraction pipeline (Phase 6) and Hindsight (Phase 7) exist — recommendations depend on both. Do not implement the rating loop (Phase 10) before Hindsight (Phase 7) exists, since ratings must feed into it, not a placeholder.
