import os
import json
import logging
from typing import Dict, Any
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

