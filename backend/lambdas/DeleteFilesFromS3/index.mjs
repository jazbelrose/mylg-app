import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Initialize the AWS clients
const s3Client = new S3Client({ region: 'us-west-1' });
const dynamoDbClient = new DynamoDBClient({ region: 'us-west-1' });
const dynamoDbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS, POST, DELETE',
    };
    
    // CORS preflight request handling
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS OK' }),
        };
    }

    const { projectId, field, fileKeys } = JSON.parse(event.body);
    const originalBucketName = 'mylguserdata194416-dev';
    const thumbnailBucketName = 'mylguserdata194416-dev-resized';

    try {
        // Deleting original files and thumbnails
        await Promise.all(fileKeys.map(async (url) => {
            const decodedUrl = decodeURIComponent(url);
            const key = decodedUrl.split('amazonaws.com/')[1];
            // Delete original image
            await s3Client.send(new DeleteObjectCommand({ Bucket: originalBucketName, Key: key }));
            // Assuming thumbnail key follows a pattern based on the original key
            // For simplicity, using the same key; adjust if your application uses a different naming scheme
            await s3Client.send(new DeleteObjectCommand({ Bucket: thumbnailBucketName, Key: key }));
        }));
    } catch (error) {
        console.error("Error deleting object from S3:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Failed to delete files from S3.' }),
        };
    }

    try {
        // Retrieve and update the DynamoDB document
        const projectData = await dynamoDbDocClient.send(new GetCommand({
            TableName: 'Projects',
            Key: { projectId },
        }));

        if (projectData.Item[field] && Array.isArray(projectData.Item[field])) {
            const newFieldData = projectData.Item[field].filter(item => 
                !fileKeys.includes(item.url)
            );

            await dynamoDbDocClient.send(new UpdateCommand({
                TableName: 'Projects',
                Key: { projectId },
                UpdateExpression: `set ${field} = :newFieldData`,
                ExpressionAttributeValues: { ':newFieldData': newFieldData },
            }));
        } else {
            console.log(`${field} is not an array or does not exist in the DynamoDB document.`);
        }
    } catch (error) {
        console.error("Error updating DynamoDB:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Failed to update database.' }),
        };
    }

    // Successful deletion response
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Files and thumbnails successfully deleted from S3 and database updated.' }),
    };
};