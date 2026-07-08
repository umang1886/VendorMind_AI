# VendorMind AI — Solution Architecture

This document describes **how** VendorMind AI is built: system architecture, data flow, database schema, AI pipeline design, and integration details. Read alongside `prd.md` (what to build) and `implementation_guide.md` (order in which to build it).

---

## 1. High-Level Architecture

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   React + Tailwind│  HTTPS  │   FastAPI Backend    │  SQL    │   PostgreSQL     │
│   (Vercel)         │◄───────►│   (Railway)           │◄───────►│   (relational)   │
└─────────────────┘         └──────────┬───────────┘         └─────────────────┘
                                        │
                     ┌──────────────────┼───────────────────┬───────────────────┐
                     │                  │                   │                   │
              ┌──────▼──────┐   ┌───────▼────────┐   ┌──────▼──────┐   ┌────────▼───────┐
              │  Gmail API   │   │  Groq LLM API   │   │  ChromaDB    │   │ Supabase      │
              │ (send/receive)│   │ (via cascadeflow)│   │ (vector store│   │ Storage       │
              │              │   │                 │   │  / Hindsight)│   │ (files/docs)  │
              └──────────────┘   └─────────────────┘   └─────────────┘   └────────────────┘
```

- **Frontend (React + Tailwind, deployed on Vercel):** Manager/Admin dashboard, RFQ creation UI, comparison views, and the public vendor quotation form (token-based, no login).
- **Backend (FastAPI, deployed on Railway):** REST API, business logic, background jobs (deadline enforcement, reminders), AI orchestration layer (cascadeflow), Gmail API integration.
- **PostgreSQL:** System of record — companies, users, vendors, RFQs, submissions, ratings, purchase orders.
- **ChromaDB:** Vector store backing the Hindsight memory system — semantic retrieval of past vendor performance, contract clauses, and negotiation outcomes.
- **Groq LLM:** All AI inference (extraction, comparison, recommendation, negotiation suggestions, contract risk analysis), accessed through the cascadeflow routing layer.
- **Gmail API:** Sends RFQ invitations, reminders, confirmation/rejection emails, and receives/links back vendor submissions.
- **Supabase Storage:** Stores uploaded vendor documents (quotations, contracts) and generated Purchase Order PDFs.

---

## 2. Core Workflow (End-to-End)

1. Manager creates RFQ (product, quantity, specs, delivery, warranty, deadline).
2. Manager selects vendors from the vendor directory.
3. Backend generates a unique, cryptographically secure submission token/link per vendor per RFQ.
4. Gmail API sends personalized RFQ invitation emails with the vendor's unique link.
5. Vendor opens the link (no login) and submits the quotation form + optional document upload.
6. After the deadline, a background job automatically closes submissions (token becomes invalid for new submissions).
7. AI extraction pipeline parses each submission: price, delivery, warranty, payment terms, contract clauses, hidden risks.
8. AI comparison engine normalizes and compares all vendor submissions.
9. AI recommendation engine ranks vendors and produces a natural-language justification, using Hindsight (past vendor performance) as additional context when available.
10. Manager reviews the comparison + recommendation, and Approves / Rejects / requests Negotiation.
11. On approval: selected vendor gets a confirmation email; all others get an automatic rejection email.
12. System generates a Purchase Order document (PDF, stored in Supabase Storage).
13. After delivery, manager submits a rating (Delivery, Quality, Communication, Support + comments).
14. Hindsight store is updated; Vendor Trust Score is recalculated.
15. This updated history feeds into all future AI recommendations for that vendor.

---

## 3. Database Schema (PostgreSQL)

### `companies`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | text | |
| created_at | timestamp | |

### `users`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| company_id | UUID (FK → companies) | |
| email | text | unique |
| role | enum | `admin`, `manager` |
| password_hash | text | |
| created_at | timestamp | |

### `vendors`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| company_id | UUID (FK → companies) | |
| name | text | |
| email | text | |
| contact_info | jsonb | phone, address, etc. |
| trust_score | numeric | rolling score, updated by Hindsight |
| created_at | timestamp | |

### `rfqs`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| company_id | UUID (FK) | |
| created_by | UUID (FK → users) | |
| product_name | text | |
| quantity | int | |
| specifications | text | |
| delivery_requirements | text | |
| warranty_requirements | text | |
| submission_deadline | timestamp | |
| status | enum | `draft`, `sent`, `closed`, `awarded`, `cancelled` |
| created_at | timestamp | |

### `rfq_vendors` (join table — vendors invited to an RFQ)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| rfq_id | UUID (FK → rfqs) | |
| vendor_id | UUID (FK → vendors) | |
| submission_token | text | unique, cryptographically random |
| token_expires_at | timestamp | |
| status | enum | `invited`, `reminded`, `submitted`, `expired` |
| invited_at | timestamp | |

### `quotations`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| rfq_vendor_id | UUID (FK → rfq_vendors) | |
| price | numeric | |
| delivery_timeline | text | |
| warranty_terms | text | |
| payment_terms | text | |
| notes | text | |
| document_url | text | Supabase Storage URL |
| ai_extracted_data | jsonb | structured extraction output |
| ai_risk_flags | jsonb | contract risk analysis output |
| submitted_at | timestamp | |

### `ai_recommendations`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| rfq_id | UUID (FK → rfqs) | |
| recommended_vendor_id | UUID (FK → vendors) | |
| comparison_summary | jsonb | full comparison table snapshot |
| reasoning | text | natural-language justification |
| negotiation_suggestions | jsonb | |
| model_used | text | which Groq model tier handled this |
| created_at | timestamp | |

### `purchase_orders`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| rfq_id | UUID (FK → rfqs) | |
| vendor_id | UUID (FK → vendors) | |
| document_url | text | generated PDF in Supabase Storage |
| terms_snapshot | jsonb | final agreed terms |
| created_at | timestamp | |

### `vendor_ratings`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| rfq_id | UUID (FK) | |
| vendor_id | UUID (FK) | |
| rated_by | UUID (FK → users) | |
| delivery_score | int | 1–5 |
| quality_score | int | 1–5 |
| communication_score | int | 1–5 |
| support_score | int | 1–5 |
| comments | text | |
| created_at | timestamp | |

---

## 4. Hindsight Memory (ChromaDB + Postgres)

Hindsight is the long-term memory layer that gives VendorMind AI institutional knowledge across procurement cycles.

**What it stores (per vendor):**
- Completed orders history
- Vendor ratings over time
- Delivery performance trend
- Quality score trend
- Communication and support history
- Previous negotiation outcomes
- Historical contract risk flags

**How it's used:**
- Structured, numeric data (scores, ratings) lives in PostgreSQL (`vendor_ratings`, `vendors.trust_score`) for fast aggregation.
- Unstructured/semantic data (negotiation transcripts, contract risk notes, free-text comments) is embedded and stored in ChromaDB, so the AI recommendation engine can retrieve semantically relevant past experiences with a given vendor (e.g., "this vendor previously had a delivery delay on similar orders").
- When generating a new AI recommendation, the backend queries both: (1) Postgres for the numeric Vendor Trust Score and rating trends, and (2) ChromaDB for relevant historical context, then feeds both into the Groq prompt as grounding context.

**Vendor Trust Score formula (v1, weighted average):**
```
trust_score = (
    0.25 * price_competitiveness_score +
    0.20 * delivery_reliability_score +
    0.20 * product_quality_score +
    0.15 * communication_score +
    0.10 * support_score +
    0.10 * contract_risk_score (inverted; lower risk = higher score)
) 
# adjusted by weighted history from previous_ratings (recent ratings weighted higher)
```
This formula should live in a single backend service (`trust_score_service`) so weighting is easy to tune later.

---

## 5. cascadeflow — Cost-Aware AI Model Routing

All AI calls go through a single orchestration layer (`ai_router`) that decides which Groq model tier to use based on task complexity:

| Task | Complexity | Model Tier |
|---|---|---|
| RFQ email drafting | Simple | Cheap/fast model |
| Basic field extraction (price, delivery, warranty from form) | Simple | Cheap/fast model |
| Document/contract risk analysis | Complex | Stronger model |
| Vendor comparison & ranking | Complex | Stronger model |
| Final recommendation + reasoning | Complex | Stronger model |
| Negotiation suggestion generation | Complex | Stronger model |

**Design principle:** the `ai_router` should expose a single function, e.g. `run_ai_task(task_type, payload)`, that internally selects the model tier — so the rest of the backend never hardcodes a model name. This makes it trivial to swap tiers or add new task types without touching business logic.

---

## 6. Gmail API Integration

- Backend authenticates with Gmail API using OAuth2 / service account credentials tied to the company's connected Gmail account.
- Email types sent:
  1. RFQ invitation (with unique tokenized link)
  2. Reminder (before deadline, if not yet submitted)
  3. Selection/confirmation email (winning vendor)
  4. Rejection email (non-selected vendors)
  5. Purchase Order delivery email
- All outbound emails should be templated (Jinja2 templates recommended) and logged (which email, to whom, when, status) for auditability.

---

## 7. Security Considerations

- Vendor submission links use a signed, random token (e.g., UUID4 + HMAC signature) — never sequential/guessable IDs.
- Tokens are single-purpose: valid only for that RFQ + vendor pair, and invalidated after submission or deadline.
- All file uploads (vendor documents) are scanned for type/size limits before storage in Supabase.
- Manager/Admin auth uses standard hashed passwords (or OAuth) + JWT-based session tokens for the FastAPI backend.
- Role-based access control (RBAC) enforced at the API layer — Admin vs. Manager permissions checked on every protected endpoint.

---

## 8. API Surface (Reference — see implementation_guide.md for build order)

```
POST   /auth/login
POST   /auth/register

GET    /vendors
POST   /vendors
PUT    /vendors/{id}

POST   /rfqs
GET    /rfqs
GET    /rfqs/{id}
POST   /rfqs/{id}/invite-vendors
POST   /rfqs/{id}/send        (triggers Gmail send)

GET    /public/quotation/{token}      (vendor-facing, no auth)
POST   /public/quotation/{token}/submit

POST   /rfqs/{id}/ai/extract          (internal trigger, or auto on submission)
POST   /rfqs/{id}/ai/compare
POST   /rfqs/{id}/ai/recommend

POST   /rfqs/{id}/approve
POST   /rfqs/{id}/reject
POST   /rfqs/{id}/negotiate

POST   /rfqs/{id}/purchase-order

POST   /rfqs/{id}/rate-vendor

GET    /dashboard
GET    /vendors/{id}/history
```

---

## 9. Deployment

- **Frontend:** React app deployed to **Vercel**, environment variables for backend API base URL.
- **Backend:** FastAPI app deployed to **Railway**, with PostgreSQL add-on and background worker (for deadline enforcement / reminders — e.g., APScheduler or Celery+Redis if scaling requires it).
- **ChromaDB:** Can run as a managed/hosted instance or a Railway service alongside the backend.
- **Supabase Storage:** Used purely for file storage (not as the primary database).
- **Secrets:** Groq API key, Gmail API credentials, Supabase keys, and JWT secret all stored as environment variables — never committed to source control.
