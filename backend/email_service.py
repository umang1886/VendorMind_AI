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
