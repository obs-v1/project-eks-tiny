"""
AWS Lambda handler for RoboShop Notification Service.

Deployment:
  1. Package: zip -r notification.zip app.py lambda_handler.py requirements.txt
  2. Upload to Lambda with Python 3.12 runtime
  3. Set handler to: lambda_handler.handler
  4. Set env vars: BREVO_API_KEY, FROM_EMAIL

Can be triggered by:
  - API Gateway (HTTP POST)
  - SQS/SNS events
  - Direct invocation from orders service
"""
import json
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notification-lambda")

# Import the email sending function from app.py
from app import send_email_brevo


def handler(event, context):
    """Lambda entry point"""
    # Handle API Gateway event
    if "body" in event:
        data = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
    # Handle direct invocation or SQS
    elif "Records" in event:
        # SQS event
        results = []
        for record in event["Records"]:
            data = json.loads(record["body"])
            result = process_notification(data)
            results.append(result)
        return {"statusCode": 200, "body": json.dumps(results)}
    else:
        data = event

    result = process_notification(data)
    return {
        "statusCode": 200,
        "body": json.dumps(result),
        "headers": {"Content-Type": "application/json"},
    }


def process_notification(data):
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
    """

    success = send_email_brevo(email, name, subject, body)
    return {"status": "sent" if success else "failed", "orderId": order_id}
