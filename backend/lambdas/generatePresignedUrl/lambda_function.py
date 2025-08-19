import json
import os
import uuid
import boto3

s3 = boto3.client('s3')

def lambda_handler(event, context):
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }

    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
    )
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers}

    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"message": "Invalid JSON"}),
       }

    project_id = body.get("projectId")
    file_name = body.get("fileName", "upload.svg")
    metadata_fields = [
        "galleryName",
        "gallerySlug",
        "galleryPassword",
        "passwordEnabled",
        "passwordTimeout",
    ]
    metadata = {}
    for field in metadata_fields:
        if field in body and body[field] is not None:
            metadata[field.lower()] = str(body[field])
    if project_id:
        metadata["projectid"] = str(project_id)
    if not project_id:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"message": "projectId required"}),
        }

    bucket = os.environ.get("SOURCE_BUCKET", "mylguserdata194416-dev")
    unique = uuid.uuid4()
    # Store user uploads under a top-level uploads/{projectId}/ prefix so
    # Lambda-generated files like processed galleries can live separately
    key = f"uploads/{project_id}/{unique}_{file_name}"

    # Consistent indentation and dynamic content type
    content_type = (
        "application/pdf"
        if file_name.lower().endswith(".pdf")
        else "image/svg+xml"
    )

    try:
        url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ContentType": content_type,
                 "Metadata": metadata,
            },
            ExpiresIn=900,
        )
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"message": str(e)}),
        }

    return {
        "statusCode": 200,
        "headers": cors_headers,
        "body": json.dumps({"uploadUrl": url, "key": key}),
    }
