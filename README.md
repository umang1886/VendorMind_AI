<div align="center">
  <img src="./frontend/public/favicon.ico" alt="VendorMind AI" width="80" />
  <h1>VendorMind AI</h1>
  <p><strong>AI-powered Procurement & Vendor Intelligence Platform</strong></p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi" alt="FastAPI" /></a>
    <a href="https://cascadeflow.io/"><img src="https://img.shields.io/badge/AI_Engine-CascadeFlow-8A2BE2?style=flat-square" alt="CascadeFlow" /></a>
    <a href="https://ui.shadcn.com/"><img src="https://img.shields.io/badge/UI-shadcn%2Fui-black?style=flat-square" alt="shadcn/ui" /></a>
  </p>
</div>

---

## 🚀 Overview

**VendorMind AI** is an intelligent procurement platform that automates the Request for Quotation (RFQ) process, vendor communication, and bid analysis. By leveraging the power of Large Language Models (LLMs) orchestrated by **CascadeFlow**, VendorMind AI analyzes incoming vendor quotations, extracts key metrics, assesses risks, and provides actionable recommendations to procurement managers.

## ✨ Features

- 🤖 **AI-Powered Recommendations:** Analyzes complex vendor proposals, evaluates trade-offs (price vs. delivery vs. warranty), and recommends the best option.
- 📊 **Intelligent Trust Scoring:** Automatically updates vendor trust scores based on past performance and post-award ratings (AI hindsight memory).
- 🛡️ **CascadeFlow Integration:** Enforces AI model routing, budget limits, cost tracking, and maintains a strict audit trail of all LLM operations.
- 📧 **Automated Email Workflows:** Automatically parses incoming quotation emails via Gmail API and auto-generates professional approval/purchase order emails.
- 🎨 **Premium UI/UX:** Built with Next.js and Tailwind CSS featuring a modern, dark-mode, glassmorphism aesthetic tailored for enterprise agents.

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + Custom Design System
- **Components:** shadcn/ui

### Backend
- **Framework:** FastAPI (Python)
- **Database:** SQLite (via SQLAlchemy & Alembic)
- **AI/LLM:** LangChain & Groq (Llama-3)
- **Orchestration:** CascadeFlow (`pip install cascadeflow`)

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Groq API Key
- Google Cloud Console Project (for Gmail API integration)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/vendormind-ai.git
cd vendormind-ai
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

**Environment Variables**  
Create a `.env` file in the `backend` directory based on `.env.example`:
```env
GROQ_API_KEY="your-groq-key"
DATABASE_URL="sqlite:///./vendormind.db"
SECRET_KEY="your-secret-key"
GMAIL_CLIENT_ID="your-client-id"
GMAIL_CLIENT_SECRET="your-client-secret"
```

**Run Migrations & Start Server**
```bash
alembic upgrade head
python -m uvicorn main:app --reload
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000) and the backend API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

## 🔒 AI Safety & Cost Control

VendorMind AI utilizes **CascadeFlow** running in `enforce` mode to wrap all LLM calls. This guarantees:
- **Budget Enforcement:** Prevents API cost overruns per request.
- **Audit Logging:** Every AI decision is logged for compliance.
- **Fallback Routing:** Graceful degradation if the primary LLM provider is unavailable.

## 📁 Project Structure

```
.
├── backend/
│   ├── routers/        # API route handlers
│   ├── models.py       # SQLAlchemy ORM models
│   ├── schemas.py      # Pydantic validation schemas
│   ├── ai_service.py   # LangChain & CascadeFlow logic
│   └── main.py         # FastAPI application entry
└── frontend/
    ├── src/
    │   ├── app/        # Next.js App Router pages
    │   ├── components/ # Reusable React components
    │   └── lib/        # Utility functions
    └── tailwind.config.js
```

---

<div align="center">
  <p>Built with ❤️ by the Procurement Intelligence Team</p>
</div>
