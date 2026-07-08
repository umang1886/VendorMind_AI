"""
Hindsight Memory Service — powered by Vectorize Hindsight (hindsight.vectorize.io)

Official REST API integration for persisting and recalling vendor performance
memory across procurement cycles.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "https://api.hindsight.vectorize.io")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", "")
HINDSIGHT_BANK_ID = os.getenv("HINDSIGHT_BANK_ID", "vendor-hindsight")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {HINDSIGHT_API_KEY}",
        "Content-Type": "application/json",
    }


def _is_configured() -> bool:
    if not HINDSIGHT_API_KEY:
        logger.warning(
            "HINDSIGHT_API_KEY is not set. "
            "Hindsight memory is disabled. "
            "Set HINDSIGHT_API_KEY and HINDSIGHT_BANK_ID in .env to enable it."
        )
        return False
    return True


def store_event(vendor_id: str, event_type: str, content: str) -> bool:
    """
    Retain a new memory event for a vendor in Hindsight.
    Called after: quotation submission, vendor rating, contract outcome.

    POST /v1/default/banks/{bank_id}/memories
    """
    if not _is_configured():
        return False

    url = f"{HINDSIGHT_API_URL}/v1/default/banks/{HINDSIGHT_BANK_ID}/memories"
    payload = {
        "items": [
            {
                "content": f"[Vendor:{vendor_id}][Event:{event_type}] {content}",
                "document_id": f"{vendor_id}_{event_type}_{os.urandom(4).hex()}"
            }
        ]
    }

    try:
        response = requests.post(url, json=payload, headers=_headers(), timeout=15)
        response.raise_for_status()
        logger.info(f"[Hindsight] Memory retained for vendor {vendor_id} — event: {event_type}")
        return True
    except requests.exceptions.HTTPError as e:
        logger.error(
            f"[Hindsight] retain() HTTP error: {e.response.status_code} — {e.response.text}"
        )
        return False
    except Exception as e:
        logger.error(f"[Hindsight] retain() error: {e}")
        return False


def retrieve_context(vendor_id: str, query: str = "vendor delivery quality performance risk history") -> list:
    """
    Recall memories from Hindsight for a specific vendor.
    Used during AI recommendation to provide historical context.

    POST /v1/default/banks/{bank_id}/memories/recall
    """
    if not _is_configured():
        return []

    url = f"{HINDSIGHT_API_URL}/v1/default/banks/{HINDSIGHT_BANK_ID}/memories/recall"
    payload = {
        "query": f"[Vendor:{vendor_id}] {query}",
        "limit": 5,
        "include_chunks": True
    }

    try:
        response = requests.post(url, json=payload, headers=_headers(), timeout=15)
        response.raise_for_status()
        data = response.json()

        # Extract memory content — handle both possible response shapes
        memories = []
        items = data.get("memories") or data.get("results") or data.get("items") or []
        for item in items:
            content = item.get("content") or item.get("text") or str(item)
            if content:
                memories.append(content)

        logger.info(f"[Hindsight] Recalled {len(memories)} memories for vendor {vendor_id}")
        return memories

    except requests.exceptions.HTTPError as e:
        logger.error(
            f"[Hindsight] recall() HTTP error: {e.response.status_code} — {e.response.text}"
        )
        return []
    except Exception as e:
        logger.error(f"[Hindsight] recall() error: {e}")
        return []
