import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const s3 = new S3Client({ region: 'us-west-1' });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-west-1' }));
const GALLERIES_TABLE = process.env.GALLERIES_TABLE || 'Galleries';

export const handler = async (event) => {
  console.log("Incoming delete payload:", JSON.stringify(event.body || event));

  // CORS headers to return on every response
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,DELETE',
  };

  // 1. Compute the incoming HTTP method (REST v1 or HTTP API v2)
  const method =
    event.httpMethod ||
    event.requestContext?.http?.method ||
    event.requestContext?.httpMethod;

  // 2. Handle preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // 3. Parse JSON body
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid JSON' })
    };
  }

  const { projectId, galleryId, gallerySlug } = body;
  if (!projectId || !(galleryId || gallerySlug)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        message: 'projectId and galleryId or gallerySlug required'
      })
    };
  }

  try {
    // Fetch project galleries if available, but don't fail if not found
    let projectGalleries = [];
    try {
      const projRes = await ddb.send(
        new GetCommand({ TableName: 'Projects', Key: { projectId } })
      );
      projectGalleries = Array.isArray(projRes.Item?.galleries)
        ? projRes.Item.galleries
        : [];
    } catch (err) {
      console.error('Failed to fetch project record', err);
    }

    const idx = projectGalleries.findIndex(
      (g) =>
        (galleryId && (g.id === galleryId || g.galleryId === galleryId)) ||
        (gallerySlug && (g.slug || '') === gallerySlug)
    );

    const galleryInProject = idx !== -1 ? projectGalleries[idx] : null;

    const slug = gallerySlug || galleryInProject?.slug || galleryId;
    const prefix = `projects/${projectId}/gallery/${slug}/`;
    let token;
    do {
      const list = await s3.send(new ListObjectsV2Command({
        Bucket: 'mylguserdata194416-dev',
        Prefix: prefix,
        ContinuationToken: token
      }));
      const toDelete = (list.Contents || []).map(o =>
        new DeleteObjectCommand({ Bucket: 'mylguserdata194416-dev', Key: o.Key })
      );
      await Promise.all(toDelete.map(cmd => s3.send(cmd)));
      token = list.IsTruncated ? list.NextContinuationToken : null;
    } while (token);

    const recordId = galleryId || galleryInProject?.galleryId || galleryInProject?.id;
    if (recordId) {
      const keys = [
        { galleryId: recordId },
        { id: recordId }
      ];
      for (const Key of keys) {
        try {
          await ddb.send(new DeleteCommand({ TableName: GALLERIES_TABLE, Key }));
        } catch (err) {
          console.error(
            `Failed to delete gallery record with key ${JSON.stringify(Key)}`,
            err
          );
        }
      }
    }

    // Remove gallery from project if present
    if (idx !== -1) {
      projectGalleries.splice(idx, 1);
      await ddb.send(
        new UpdateCommand({
          TableName: 'Projects',
          Key: { projectId },
          UpdateExpression: 'SET galleries = :g',
          ExpressionAttributeValues: { ':g': projectGalleries },
        })
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Gallery deleted' })
    };

  } catch (err) {
    console.error('delete gallery error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Failed to delete gallery' })
    };
  }
};
