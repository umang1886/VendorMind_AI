import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

# Setup Jinja2 environment
template_dir = os.path.join(os.path.dirname(__file__), "templates")
os.makedirs(template_dir, exist_ok=True)
env = Environment(loader=FileSystemLoader(template_dir))


def get_template(template_name: str):
    return env.get_template(template_name)


def send_email(to: str, subject: str, html_content: str):
    """Send email via Gmail SMTP using App Password."""
    gmail_user = os.getenv("GMAIL_USER")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_app_password:
        logger.warning(
            "GMAIL_USER or GMAIL_APP_PASSWORD not set in .env! "
            "Falling back to mock email.\n"
            f"--- MOCK EMAIL ---\nTo: {to}\nSubject: {subject}\n------------------"
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = gmail_user
        msg["To"] = to
        msg["Subject"] = subject

        # Attach plain text fallback + HTML
        plain_text = "Please enable HTML to view this email."
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(gmail_user, gmail_app_password)
            smtp.sendmail(gmail_user, to, msg.as_string())

        logger.info(f"Email sent successfully to {to}")
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error(
            "Gmail SMTP authentication failed. "
            "Make sure GMAIL_USER and GMAIL_APP_PASSWORD are correct, "
            "and that you are using an App Password (not your regular Gmail password)."
        )
        return False
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def send_rfq_invitation(vendor_email: str, vendor_name: str, rfq_title: str, token: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    submission_link = f"{frontend_url}/quote/{token}"

    template = get_template("rfq_invitation.html")
    html_content = template.render(
        vendor_name=vendor_name,
        rfq_title=rfq_title,
        submission_link=submission_link,
    )

    return send_email(
        to=vendor_email,
        subject=f"Request for Quotation: {rfq_title}",
        html_content=html_content,
    )


def send_negotiation_email(to: str, subject: str, body: str, rfq_id: str, vendor_id: str):
    """
    Send a negotiation email to a vendor with a tracking reference embedded in the subject.
    The ref tag allows identifying replies for this specific RFQ/Vendor conversation.
    """
    ref_tag = f"[REF:{rfq_id[:8]}-{vendor_id[:8]}]"
    full_subject = f"{subject} {ref_tag}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; max-width: 600px;">
        {body.replace(chr(10), '<br/>')}
        <br/><br/>
        <p style="color: #999; font-size: 11px;">Reference: {ref_tag}</p>
    </div>
    """
    return send_email(to=to, subject=full_subject, html_content=html_content)


def check_vendor_replies(rfq_id: str, vendor_id: str, vendor_email: str, seen_message_ids: list = None) -> list:
    """
    Check Gmail for replies from a vendor related to a specific RFQ negotiation.
    Uses IMAP with the same GMAIL_USER and GMAIL_APP_PASSWORD as sending.
    """
    import imaplib
    import email
    from email.header import decode_header
    
    gmail_user = os.getenv("GMAIL_USER")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_app_password:
        logger.warning("GMAIL_USER or GMAIL_APP_PASSWORD not set. Cannot check vendor replies via IMAP.")
        return []

    try:
        # Connect to Gmail IMAP
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(gmail_user, gmail_app_password)
        
        # Select inbox
        mail.select("inbox")

        # Search for messages from the vendor with the reference tag in the subject
        ref_tag = f"REF:{rfq_id[:8]}-{vendor_id[:8]}"
        
        # We search both FROM and SUBJECT
        status, messages = mail.search(None, f'(FROM "{vendor_email}" SUBJECT "{ref_tag}")')
        
        if status != "OK":
            logger.error(f"IMAP search failed: {status}")
            return []
            
        msg_nums = messages[0].split()
        logger.info(f"[check_vendor_replies] Found {len(msg_nums)} message(s) via IMAP")

        new_replies = []
        seen = set(seen_message_ids or [])

        for num in msg_nums:
            status, data = mail.fetch(num, '(RFC822)')
            if status != "OK":
                continue
                
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            # The IMAP Message-ID is usually surrounded by angle brackets <...>
            msg_id = msg.get("Message-ID", "")
            if not msg_id:
                # Fallback if Message-ID is missing
                msg_id = msg.get("Date", str(num.decode('utf-8')))
                
            if msg_id in seen:
                logger.info(f"[check_vendor_replies] Skipping already-seen message {msg_id}")
                continue

            # Decode Subject
            subject_header = msg.get("Subject", "(no subject)")
            decoded_subject = ""
            for part, encoding in decode_header(subject_header):
                if isinstance(part, bytes):
                    decoded_subject += part.decode(encoding or 'utf-8', errors='replace')
                else:
                    decoded_subject += part
                    
            sender = msg.get("From", "").lower()
            if gmail_user.lower() in sender:
                logger.info(f"[check_vendor_replies] Skipping our own sent email msg_id={msg_id}")
                continue

            # Extract body
            body_text = ""
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition"))

                    if content_type == "text/plain" and "attachment" not in content_disposition:
                        payload = part.get_payload(decode=True)
                        charset = part.get_content_charset() or 'utf-8'
                        if payload:
                            body_text = payload.decode(charset, errors='replace')
                            break
            else:
                if msg.get_content_type() == "text/plain":
                    payload = msg.get_payload(decode=True)
                    charset = msg.get_content_charset() or 'utf-8'
                    if payload:
                        body_text = payload.decode(charset, errors='replace')

            if body_text.strip():
                logger.info(f"[check_vendor_replies] New vendor reply found: msg_id={msg_id} subject={decoded_subject}")
                new_replies.append({
                    "message_id": msg_id,
                    "subject": decoded_subject,
                    "body": body_text.strip()
                })
            else:
                logger.warning(f"[check_vendor_replies] No text body extracted for msg_id={msg_id}")

        mail.close()
        mail.logout()
        return new_replies

    except Exception as e:
        logger.error(f"Failed to check vendor replies via IMAP: {e}", exc_info=True)
        return []
