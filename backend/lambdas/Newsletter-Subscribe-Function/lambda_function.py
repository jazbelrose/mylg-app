import json
import boto3

def lambda_handler(event, context):
    # CORS Headers
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Access-Control-Allow-Headers": "Content-Type",
    }

# Set the Content-Type header to application/json
    event['headers']['Content-Type'] = 'application/json'
    
    # Handle OPTIONS preflight request
    if event['httpMethod'] == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"message": "CORS preflight successful"}),
        }

    # Parse the request body
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
    except (json.JSONDecodeError, TypeError):
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Invalid request body"}),
        }

    if not email:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Email is required"}),
        }

    # Initialize SES client
    ses_client = boto3.client('ses', region_name='us-east-1')

    try:
        # Send subscription confirmation email
        ses_client.send_email(
            Source="info@jensenandjuhl.com",
            Destination={"ToAddresses": ["info@jensenandjuhl.com"]},
            Message={
                "Subject": {"Data": "New Newsletter Subscriber"},
                "Body": {"Text": {"Data": f"A new subscriber: {email}"}}
            },
        )
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"message": "Subscription successful"}),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }
