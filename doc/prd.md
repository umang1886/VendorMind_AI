# VendorMind AI — Product Requirements Document (PRD)

## 1. Overview

**Product Name:** VendorMind AI — Intelligent Vendor Selection, Negotiation & Procurement Assistant

**Goal:** Build an AI-powered procurement platform that automates the complete RFQ (Request for Quotation) lifecycle — from creation, to vendor outreach, quotation comparison, AI-driven vendor recommendation, approval, purchase order generation, and post-delivery vendor rating — while continuously learning from every completed procurement to improve future recommendations.

**One-line pitch:** VendorMind AI replaces manual, error-prone, Excel-based vendor procurement with an automated, AI-assisted workflow that remembers vendor performance over time.

---

## 2. Problem Statement

Companies today manually:
- Create RFQs in documents/spreadsheets
- Email vendors individually
- Compare quotations manually in Excel
- Review contracts without structured risk analysis
- Negotiate without historical context
- Select vendors based on incomplete or forgotten past performance

This process is **slow, error-prone, and has no institutional memory** — companies repeatedly forget how a vendor performed on previous orders (delivery delays, quality issues, communication problems), leading to suboptimal vendor selection.

---

## 3. Objectives / Goals

1. Automate RFQ creation and vendor outreach (via Gmail API).
2. Provide vendors with a secure, trackable submission form (accessible from email, no login required).
3. Use AI to extract structured data (price, delivery, warranty, payment terms, contract clauses, hidden risks) from vendor submissions.
4. Use AI to compare vendors and recommend the best one with clear reasoning.
5. Allow managers to approve, reject, or negotiate before finalizing.
6. Auto-generate Purchase Orders for the selected vendor.
7. Capture post-delivery vendor ratings and feed them into a persistent "Hindsight" memory system.
8. Use that memory to continuously improve future vendor recommendations (Vendor Trust Score).
9. Keep AI costs low via a cost-aware model-routing strategy (cascadeflow): cheap models for simple tasks, stronger models for complex reasoning.

---

## 4. User Roles & Permissions

### 4.1 Company Admin
- Manage company profile/settings
- Manage vendor directory (add/edit/remove vendors)
- View company-wide dashboard (all RFQs, all vendors, all analytics)
- Manage Procurement Manager user accounts

### 4.2 Procurement Manager
- Create RFQ (product, quantity, specifications, delivery terms, warranty, submission deadline)
- Select vendors to invite for a given RFQ
- Trigger sending of RFQ emails
- Review AI-generated vendor comparison and recommendation
- Approve / reject / request negotiation on a recommended vendor
- Rate vendor after delivery is completed
- View RFQ-specific and vendor-specific dashboards

### 4.3 Vendor (external, no account required)
- Receive RFQ invitation email with a unique, secure link
- Open the secure quotation form (no login — token-based access)
- Fill in all requested quotation details (price, delivery timeline, warranty, payment terms, notes)
- Upload supporting documents (e.g., contract/quotation PDF)
- Submit before the deadline (form auto-closes after deadline)

---

## 5. Functional Requirements

### 5.1 RFQ Management
- FR-1: Manager can create an RFQ with: product name, quantity, specifications, delivery requirements, warranty requirements, and a submission deadline.
- FR-2: Manager can select one or more vendors from the company vendor directory to invite.
- FR-3: System generates a unique, secure, tokenized submission link per vendor per RFQ.
- FR-4: System sends personalized RFQ invitation emails automatically via Gmail API.
- FR-5: System automatically closes submissions once the deadline passes; no further submissions accepted after that point.
- FR-6: System sends automated reminder emails to vendors who have not yet submitted (before deadline).

### 5.2 Vendor Quotation Submission
- FR-7: Vendor can open their unique secure link without creating an account.
- FR-8: Vendor can fill out a structured quotation form: price, delivery timeline, warranty terms, payment terms, and any additional notes.
- FR-9: Vendor can upload supporting files (e.g., formal quotation document/contract).
- FR-10: Vendor submission is locked once submitted (no edits after submission unless explicitly reopened by the manager).

### 5.3 AI Extraction & Analysis
- FR-11: AI extracts structured fields from each vendor's submission: price, delivery timeline, warranty, payment terms, contract clauses, and flags any hidden risks in uploaded documents.
- FR-12: AI performs contract risk analysis on uploaded documents (e.g., unfavorable clauses, penalty terms, ambiguous language).
- FR-13: AI compares all vendor submissions side-by-side on a normalized basis.
- FR-14: AI generates a ranked recommendation of the best vendor, including a plain-language explanation of *why*.
- FR-15: AI generates negotiation suggestions (e.g., "Vendor B's price is 12% above the lowest bid — consider requesting a revised quote citing Vendor A's terms").

### 5.4 Approval Workflow
- FR-16: Manager reviews the AI recommendation and comparison table.
- FR-17: Manager can Approve (selects the recommended or a different vendor), Reject (restart/cancel RFQ), or Negotiate (send a counter-request to a vendor).
- FR-18: On approval, the selected vendor receives a confirmation email; all other vendors automatically receive a polite rejection email.

### 5.5 Purchase Order
- FR-19: System auto-generates a Purchase Order (PO) document once a vendor is approved, using the agreed terms.

### 5.6 Vendor Rating & Hindsight Memory
- FR-20: After delivery is marked complete, the manager rates the vendor on: Delivery, Quality, Communication, and Support, plus free-text comments.
- FR-21: AI updates the Vendor Trust Score based on the new rating combined with historical data.
- FR-22: The Hindsight memory store persists: completed orders, ratings, delivery performance, quality scores, communication scores, support scores, prior negotiation outcomes, and contract risk history — all keyed per vendor.
- FR-23: Future AI recommendations must factor in Hindsight data for any vendor with prior history.

### 5.7 Dashboard & Reporting
- FR-24: Dashboard shows: total RFQs, vendor response status, submitted quotations, comparison tables, AI recommendations, vendor trust scores, risk reports, procurement savings, and full vendor history.

### 5.8 Cost-Aware AI Routing (cascadeflow)
- FR-25: Simple/low-stakes AI tasks (e.g., email drafting, basic field extraction) are routed to cheaper/faster models.
- FR-26: Complex/high-stakes AI tasks (e.g., contract risk analysis, final vendor recommendation) are routed to stronger models.
- FR-27: All AI calls (regardless of tier) use Groq as the LLM provider.

---

## 6. Non-Functional Requirements

- **NFR-1 Security:** Vendor submission links must be unique, unguessable (cryptographically random tokens), and expire after the deadline or after submission.
- **NFR-2 Reliability:** Deadline enforcement and email sending must be handled by reliable background jobs (no silent failures).
- **NFR-3 Auditability:** Every RFQ, submission, AI recommendation, approval decision, and rating must be timestamped and stored for audit purposes.
- **NFR-4 Performance:** Dashboard and comparison views should load key data in under 2 seconds for typical RFQ sizes (up to ~20 vendors).
- **NFR-5 Cost Efficiency:** AI cost per RFQ should be minimized via cascadeflow model routing without materially degrading recommendation quality.
- **NFR-6 Data Privacy:** Vendor-submitted data and contract documents must be stored securely (Supabase Storage) with access limited to the relevant company.
- **NFR-7 Usability:** Vendor-facing quotation form must be fully usable on mobile without requiring account creation or app install.

---

## 7. Success Metrics

- Reduction in average time from RFQ creation to vendor selection.
- % of RFQs where the manager approves the AI-recommended vendor (trust in AI recommendation).
- Reduction in procurement cost (tracked via "Procurement Savings" metric).
- Vendor Trust Score correlation with actual repeat-vendor satisfaction over time.
- AI cost per RFQ (tracking cascadeflow savings vs. always using the strongest model).

---

## 8. Out of Scope (v1)

- Multi-currency/international tax handling.
- Vendor-side account/login system (v1 is fully link/token-based, no vendor accounts).
- Deep ERP/accounting system integrations (tracked as a future enhancement).
- Mobile native apps (v1 is responsive web only).

---

## 9. Technology Stack (Reference)

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL + ChromaDB |
| AI | Groq LLM + Hindsight (memory) + cascadeflow (routing) |
| Email | Gmail API |
| Storage | Supabase Storage |
| Deployment | Vercel (frontend) + Railway (backend) |

See `solution.md` for full architecture and `implementation_guide.md` for the build plan.
