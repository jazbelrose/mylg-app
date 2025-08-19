import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize the AWS clients
const s3Client = new S3Client({ region: 'us-west-1' });
const dynamoDbClient = new DynamoDBClient({ region: 'us-west-1' });
const dynamoDbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS, GET',
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS OK' }),
        };
    }

    const projectId = event.queryStringParameters?.projectId;

    if (!projectId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Missing or invalid projectId.' }),
        };
    }

    try {
        const projectData = await dynamoDbDocClient.send(new GetCommand({
            TableName: 'Projects',
            Key: { projectId },
        }));

        if (!projectData.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found.' }),
        };
        }

        // Assuming the need to remove the first character is validated. If not, this line needs reevaluation.
        const downloads = projectData.Item.downloads.slice(1);

        // Validation for downloads
        if (!downloads || downloads.trim() === '') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid downloads format or path.' }),
            };
        }

        console.log("Downloads:", downloads); // Log downloads to check its value

        const s3Data = await s3Client.send(new ListObjectsV2Command({
            Bucket: 'mylguserdata194416-dev',
            Prefix: downloads,
        }));

       const files = s3Data.Contents?.filter(obj => {
    const key = obj.Key.toLowerCase();
    return key.endsWith('.png') || key.endsWith('.jpg') || key.endsWith('.jpeg');
}).map(obj => ({
    name: obj.Key.split('/').pop(),
    url: `https://mylguserdata194416-dev.s3.us-west-1.amazonaws.com/${encodeURIComponent(obj.Key)}`
})) || [];

        console.log(`Project ID received: ${projectId}`);
        console.log(`Downloads path fetched: ${downloads}`);
        console.log(`Project data fetched: ${JSON.stringify(projectData.Item)}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ files }),
        };
    } catch (error) {
        console.error("Error fetching data:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Failed to retrieve files.', error: error.message }),
        };
    }
};
