import os
import json
import logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

from obs import setup_json_logging
setup_json_logging()
logger = logging.getLogger("notification")

app = Flask(__name__)
CORS(app)
# metrics pillar: PrometheusMetrics adds /metrics for the node agent scrape
from prometheus_flask_exporter import PrometheusMetrics
metrics = PrometheusMetrics(app)

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@roboshop.demo")
FROM_NAME = os.getenv("FROM_NAME", "RoboShop")


def send_email_brevo(to_email, to_name, subject, body):
    """Send email via Brevo (Sendinblue) API - Free tier: 300 emails/day"""
    if not BREVO_API_KEY:
        logger.info(f"[MOCK EMAIL] To: {to_email}, Subject: {subject}, Body: {body}")
        return True

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "sender": {"name": FROM_NAME, "email": FROM_EMAIL},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": f"<html><body>{body}</body></html>",
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code in (200, 201):
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        else:
            logger.error(f"Brevo API error: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


@app.route("/health")
def health():
    return jsonify({"status": "OK", "service": "notification"})


@app.route("/notification/send", methods=["POST"])
def send_notification():
    data = request.json
    order_id = data.get("orderId", "N/A")
    email = data.get("email", "")
    name = data.get("name", "Customer")
    total = data.get("total", 0)

    subject = f"RoboShop - Order Confirmation #{order_id}"
    body = f"""
    <h2>Thank you for your order, {name}!</h2>
    <p>Your order <strong>#{order_id}</strong> has been confirmed.</p>
    <p>Total: <strong>${total:.2f}</strong></p>
    <p>We'll notify you when your order ships.</p>
    <hr>
    <p style="color: #666; font-size: 12px;">This is a demo application - RoboShop</p>
    """

    success = send_email_brevo(email, name, subject, body)
    status = "sent" if success else "failed"

    logger.info(f"Notification {status} for order {order_id} to {email}")
    return jsonify({"status": status, "orderId": order_id})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8008")))
