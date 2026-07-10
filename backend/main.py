import os
from dotenv import load_dotenv
load_dotenv()  # Load .env before any other imports
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, vendors, rfqs, public, dashboard
import scheduler
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables in the database (safe if they already exist)
    from database import engine, Base
    import models  # noqa: F401 - ensures all models are registered
    Base.metadata.create_all(bind=engine)
    # Start scheduler
    sched = scheduler.start_scheduler()
    yield
    # Shutdown
    sched.shutdown()

app = FastAPI(title="VendorMind AI API", lifespan=lifespan)

app.add_middleware(

    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(rfqs.router)
app.include_router(public.router)
app.include_router(dashboard.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

def get_google_flow():
    from google_auth_oauthlib.flow import Flow
    client_config = {
        "web": {
            "client_id": os.environ.get("GMAIL_CLIENT_ID", ""),
            "client_secret": os.environ.get("GMAIL_CLIENT_SECRET", ""),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=[
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
        ],
        redirect_uri='http://localhost:8000/auth/gmail/callback'
    )

google_auth_flow = None

@app.get("/auth/gmail/login")
def gmail_login():
    global google_auth_flow
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    google_auth_flow = get_google_flow()
    auth_url, _ = google_auth_flow.authorization_url(prompt='consent', access_type='offline')
    return RedirectResponse(auth_url)

@app.get("/auth/gmail/callback")
def gmail_callback(request: Request):
    global google_auth_flow
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    if not google_auth_flow:
        return {"error": "Flow state missing. Please try logging in again."}
    
    google_auth_flow.fetch_token(authorization_response=str(request.url))
    with open("token.json", "w") as f:
        f.write(google_auth_flow.credentials.to_json())
    return {"message": "Gmail authentication successful! You can close this tab and emails will now be sent."}
