import os
import json
import logging
from typing import Dict, Any
import PyPDF2

try:
    from langchain_groq import ChatGroq
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    AI_AVAILABLE = True
except ImportError:
    ChatGroq = None
    PromptTemplate = None
    StrOutputParser = None
    AI_AVAILABLE = False
import cascadeflow
cascadeflow.init(mode="enforce")

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your_groq_api_key")

def get_llm(tier: str = "cheap"):
    # cascadeflow logic: select model based on tier
    # groq models: llama-3.1-8b-instant for cheap, llama-3.3-70b-versatile for complex
    model_name = "llama-3.1-8b-instant" if tier == "cheap" else "llama-3.3-70b-versatile"
    
    return ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name=model_name,
        temperature=0.1
    )

def extract_quotation_data(quotation_text: str) -> Dict[str, Any]:
    if not AI_AVAILABLE:
        return {"price_extracted": None, "delivery_timeline": None, "warranty": None, "payment_terms": None, "key_clauses": None}
        
    llm = get_llm(tier="cheap")
    
    prompt = PromptTemplate.from_template(
        "Extract the following information from the vendor's quotation text. "
        "Return ONLY a valid JSON object with the following keys: "
        "'price_extracted', 'delivery_timeline', 'warranty', 'payment_terms', 'key_clauses'. "
        "If a value is not found, use null.\n\n"
        "Quotation Text:\n{text}\n\n"
        "JSON Output:"
    )
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        response = chain.invoke({"text": quotation_text})
        # Strip markdown json blocks if any
        if response.startswith("```json"):
            response = response.replace("```json", "").replace("```", "").strip()
        elif response.startswith("```"):
            response = response.replace("```", "").strip()
            
        return json.loads(response)
    except Exception as e:
        logger.error(f"Failed to extract quotation data: {e}")
        return {}

def analyze_contract_risk(contract_text: str) -> Dict[str, Any]:
    if not AI_AVAILABLE:
        return {"risks": []}
        
    llm = get_llm(tier="complex")
    
    prompt = PromptTemplate.from_template(
        "Analyze the following contract/quotation text for risks. "
        "Identify any unfavorable clauses, penalty terms, or ambiguous language for the buyer. "
        "Return ONLY a valid JSON object with the key 'risks' mapping to a list of strings describing the risks. "
        "If no risks are found, return an empty list.\n\n"
        "Contract Text:\n{text}\n\n"
        "JSON Output:"
    )
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        response = chain.invoke({"text": contract_text})
        if response.startswith("```json"):
            response = response.replace("```json", "").replace("```", "").strip()
        elif response.startswith("```"):
            response = response.replace("```", "").strip()
            
        return json.loads(response)
    except Exception as e:
        logger.error(f"Failed to analyze contract risk: {e}")
        return {"risks": []}

def run_ai_extraction(quotation_id: str, db):
    """Background task to run extraction after submission."""
    import models
    quotation = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not quotation: return
    
    # Simulate combining form text + document text
    combined_text = f"Price: {quotation.price}\nDelivery: {quotation.delivery_timeline}\nWarranty: {quotation.warranty_terms}\nPayment: {quotation.payment_terms}\nNotes: {quotation.notes}"
    
    # Extract text from attached PDF if present
    if quotation.document_url and quotation.document_url.lower().endswith('.pdf'):
        try:
            if os.path.exists(quotation.document_url):
                with open(quotation.document_url, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    pdf_text = ""
                    for page in reader.pages:
                        text = page.extract_text()
                        if text:
                            pdf_text += text + "\n"
                
                if pdf_text.strip():
                    combined_text += "\n\n--- EXTRACTED PDF CONTENT ---\n" + pdf_text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from PDF {quotation.document_url}: {e}")
            
    extracted_data = extract_quotation_data(combined_text)
    risk_flags = analyze_contract_risk(combined_text)
    
    quotation.ai_extracted_data = extracted_data
    quotation.ai_risk_flags = risk_flags
    db.commit()
def generate_recommendation(rfq: Any, quotations: list, hindsight_contexts: dict) -> Dict[str, Any]:
    if not AI_AVAILABLE:
        return {"recommended_vendor_id": None, "reasoning": "AI missing. Mock recommendation.", "negotiation_suggestions": []}
        
    llm = get_llm(tier="complex")
    
    quotations_data = []
    for q in quotations:
        vendor_id = q.rfq_vendor.vendor_id
        q_info = {
            "vendor_id": str(vendor_id),
            "price": q.price,
            "delivery": q.delivery_timeline,
            "warranty": q.warranty_terms,
            "risks": q.ai_risk_flags,
            "hindsight": hindsight_contexts.get(vendor_id, "No history.")
        }
        quotations_data.append(q_info)
        
    prompt = PromptTemplate.from_template(
        "You are an expert procurement AI. Recommend the best vendor for this RFQ.\n\n"
        "RFQ Requirements:\nProduct: {product}\nSpecs: {specs}\n\n"
        "Quotations:\n{quotations}\n\n"
        "Return ONLY a valid JSON object with the keys: "
        "'recommended_vendor_id' (string), 'reasoning' (string), 'negotiation_suggestions' (list of strings)."
    )
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        response = chain.invoke({
            "product": rfq.product_name,
            "specs": rfq.specifications,
            "quotations": json.dumps(quotations_data, indent=2)
        })
        if response.startswith("```json"):
            response = response.replace("```json", "").replace("```", "").strip()
        elif response.startswith("```"):
            response = response.replace("```", "").strip()
            
        return json.loads(response)
    except Exception as e:
        logger.error(f"Failed to generate recommendation: {e}")
        return {"recommended_vendor_id": None, "reasoning": "Failed to generate", "negotiation_suggestions": []}


def handle_chat_message(
    rfq_product: str,
    vendor_name: str,
    vendor_email: str,
    rfq_id: str,
    vendor_id: str,
    user_message: str,
    chat_history: list,
    db=None
) -> str:
    """
    Process a user message in the negotiation chatbot.
    If the user asks to send an email, the AI will draft and send it automatically.
    Returns the AI's reply as a string.
    """
    if not AI_AVAILABLE:
        return "AI service unavailable. Please check your configuration."

    import email_service

    llm = get_llm(tier="complex")

    # Build the conversation history as a string for the prompt
    history_str = ""
    for msg in chat_history[-10:]:  # last 10 messages for context window
        role_label = "You (Procurement Manager)" if msg["role"] == "user" else "AI Assistant"
        history_str += f"{role_label}: {msg['content']}\n"

    system_prompt = (
        f"You are a professional procurement negotiation assistant for VendorMind AI. "
        f"You are helping negotiate with vendor '{vendor_name}' (email: {vendor_email}) "
        f"regarding the RFQ for product '{rfq_product}'.\n\n"
        f"Your capabilities:\n"
        f"1. Discuss negotiation strategy and terms with the procurement manager.\n"
        f"2. Draft professional emails to the vendor.\n"
        f"3. When the user asks you to SEND an email (e.g., 'send this', 'send the email', 'go ahead and send'), "
        f"you MUST include a JSON block at the very end of your response in this exact format:\n"
        f'[EMAIL_ACTION]{{"subject": "...", "body": "..."}}\n\n'
        f"The email body should be professional HTML-safe plain text.\n"
        f"If the user is just chatting or asking for a draft, do NOT include the [EMAIL_ACTION] block.\n\n"
        f"Conversation history:\n{history_str}"
    )

    prompt = PromptTemplate.from_template(
        "{system}\n\nProcurement Manager: {message}\n\nAI Assistant:"
    )
    chain = prompt | llm | StrOutputParser()

    try:
        response = chain.invoke({"system": system_prompt, "message": user_message})
        response = response.strip()

        # Check if AI wants to send an email
        if "[EMAIL_ACTION]" in response:
            parts = response.split("[EMAIL_ACTION]", 1)
            ai_text = parts[0].strip()
            action_json_str = parts[1].strip()
            try:
                action = json.loads(action_json_str)
                subject = action.get("subject", f"Negotiation: {rfq_product}")
                body = action.get("body", "")
                # Send the email
                email_service.send_negotiation_email(
                    to=vendor_email,
                    subject=subject,
                    body=body,
                    rfq_id=rfq_id,
                    vendor_id=vendor_id
                )
                return ai_text + f"\n\n✅ **Email sent to {vendor_name}** ({vendor_email}) with subject: *\"{subject}\"*"
            except Exception as e:
                logger.error(f"Failed to parse/send email action: {e}")
                return response  # Return raw response if email parse fails
        return response
    except Exception as e:
        logger.error(f"Chat AI error: {e}")
        return "Sorry, I encountered an error processing your message. Please try again."


def analyze_vendor_reply(reply_text: str, vendor_name: str) -> str:
    """
    Analyze a vendor's email reply and return a summary for the chatbot.
    """
    if not AI_AVAILABLE:
        return f"📧 New reply from {vendor_name} received:\n\n{reply_text}"

    llm = get_llm(tier="cheap")

    prompt = PromptTemplate.from_template(
        "A vendor named '{vendor}' has replied to a negotiation email. "
        "Analyze their reply and provide a concise summary of:\n"
        "1. What they agreed to\n"
        "2. What they rejected or countered\n"
        "3. Any new terms or conditions they proposed\n"
        "4. Recommended next steps for the procurement manager\n\n"
        "Vendor Reply:\n{reply}\n\n"
        "Summary:"
    )
    chain = prompt | llm | StrOutputParser()

    try:
        summary = chain.invoke({"vendor": vendor_name, "reply": reply_text})
        return f"📧 **New reply from {vendor_name}:**\n\n{summary.strip()}"
    except Exception as e:
        logger.error(f"Failed to analyze vendor reply: {e}")
        return f"📧 New reply from {vendor_name} received:\n\n{reply_text}"
