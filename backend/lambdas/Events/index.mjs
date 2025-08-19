import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const low = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(low, {
  marshallOptions: { removeUndefinedValues: true },
});

// match your template's Globals->Environment->Variables.TABLE_NAME
const TABLE_NAME = process.env.TABLE_NAME || "Events";

// helpers for API Gateway v1 + v2
const getMethod = (evt) =>
  evt?.requestContext?.http?.method?.toUpperCase?.() ||
  evt?.httpMethod?.toUpperCase?.() ||
  "GET";
const getQS = (evt) => evt.queryStringParameters || {};

/** ---- CORS CONFIG ---- **/
const EXPLICIT_ALLOW = new Set([
  "http://localhost:3000",
  "http://192.168.1.200:3000", // ← update if your LAN IP differs
  "https://mylg.studio",
  "https://www.mylg.studio",
]);

const hostAllowed = (h) => h === "mylg.studio" || h.endsWith(".mylg.studio");

const pickAllowOrigin = (reqOrigin) => {
  if (!reqOrigin) return "http://localhost:3000";
  const normalized = String(reqOrigin).replace(/\/$/, "");
  if (EXPLICIT_ALLOW.has(normalized)) return normalized;
  try {
    const u = new URL(reqOrigin);
    if (hostAllowed(u.hostname)) return `${u.protocol}//${u.host}`;
  } catch {}
  return "http://localhost:3000";
};

const ALLOW_CREDENTIALS = false; // set true only if you use cookies

const buildCORS = (event) => {
  const hdrs = event?.headers || {};
  const reqOrigin = hdrs.origin || hdrs.Origin || hdrs.ORIGIN || "";
  const allowOrigin = pickAllowOrigin(reqOrigin);

  const base = {
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent",
    "Access-Control-Allow-Methods": "OPTIONS,GET,PUT",
    "Access-Control-Expose-Headers": "Authorization,x-amzn-RequestId,x-amz-apigw-id",
    "Access-Control-Max-Age": "600",
  };
  if (ALLOW_CREDENTIALS) base["Access-Control-Allow-Credentials"] = "true";
  return base;
};

const json = (statusCode, headers, body) => ({
  statusCode,
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(body ?? ""),
});

async function batchWriteAll(requestItems, tableName) {
  // Write in chunks of 25; retry unprocessed
  for (let i = 0; i < requestItems.length; i += 25) {
    let chunk = requestItems.slice(i, i + 25);
    let unprocessed = { [tableName]: chunk };

    // simple exponential backoff retry
    let attempts = 0;
    while (unprocessed && Object.keys(unprocessed).length && attempts < 6) {
      const res = await dynamo.send(
        new BatchWriteCommand({ RequestItems: unprocessed })
      );
      unprocessed = res.UnprocessedItems;
      if (unprocessed && Object.keys(unprocessed).length) {
        await new Promise((r) => setTimeout(r, 2 ** attempts * 100)); // 100ms, 200ms, ...
      }
      attempts++;
    }
  }
}

export const handler = async (event) => {
  let statusCode = 200;
  let body;

  const CORS = buildCORS(event);

  try {
    const method = getMethod(event);

    // CORS preflight
    if (method === "OPTIONS") {
      return { statusCode: 204, headers: CORS, body: "" };
    }

    if (method === "GET") {
      const { projectId } = getQS(event);
      if (!projectId) {
        statusCode = 400;
        body = { error: "Missing projectId" };
      } else {
        const res = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "#p = :p",
            ExpressionAttributeNames: { "#p": "projectId" },
            ExpressionAttributeValues: { ":p": projectId },
          })
        );
        body = res.Items || [];
      }
    } else if (method === "PUT") {
      const { projectId } = getQS(event);
      if (!projectId) {
        statusCode = 400;
        body = { error: "Missing projectId" };
      } else {
        const payload = JSON.parse(event.body || "{}");
        const events = Array.isArray(payload.events) ? payload.events : [];

        // fetch existing for delete-all-then-put
        const existing = await dynamo.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "#p = :p",
            ExpressionAttributeNames: { "#p": "projectId" },
            ExpressionAttributeValues: { ":p": projectId },
          })
        );

        const deleteReqs =
          (existing.Items || []).map((ev) => ({
            DeleteRequest: {
              Key: { projectId, eventId: ev.eventId },
            },
          })) || [];

        const putReqs = events.map((ev) => {
          const id = ev.eventId || ev.id || randomUUID();
          return {
            PutRequest: {
              Item: {
                ...ev,
                projectId,
                eventId: id,
                id, // optional mirror
              },
            },
          };
        });

        await batchWriteAll([...deleteReqs, ...putReqs], TABLE_NAME);
        body = { updated: events.length };
      }
    } else {
      statusCode = 405;
      body = { error: `Unsupported method ${method}` };
    }
  } catch (err) {
    statusCode = err?.$metadata?.httpStatusCode || 500;
    body = { error: err?.message || "Internal error" };
  }

  return json(statusCode, CORS, body);
};
