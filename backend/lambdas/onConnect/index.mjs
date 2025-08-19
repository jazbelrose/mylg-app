import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

export const handler = async (event) => {
  console.log("🚀 onConnect triggered");
  console.log("🔌 New WebSocket Connection Event:", JSON.stringify(event, null, 2));

  const connectionId = event?.requestContext?.connectionId;
  const auth = event?.requestContext?.authorizer || {};
  const userId = auth.userId;

  // Normalize headers to lowercase
  const H = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  const MV = Object.fromEntries(
    Object.entries(event.multiValueHeaders || {}).map(([k, v]) => [k.toLowerCase(), v])
  );

  // Browser sent: "token, sessionId"
  const rawProto =
    H["sec-websocket-protocol"] ||
    (Array.isArray(MV["sec-websocket-protocol"]) ? MV["sec-websocket-protocol"][0] : "") ||
    "";

  const parts = rawProto.split(",").map(s => s && s.trim()).filter(Boolean);
  const token = parts[0] || "";             // first subprotocol offered
  const sessionId = parts[1] || "";         // second subprotocol offered
  const selected = token || undefined;      // echo EXACTLY ONE back

  console.log("🔁 offered:", rawProto);
  console.log("🔁 selected:", selected);

  if (!userId) {
    console.error("🚫 Unauthorized connection attempt.");
    return { statusCode: 403, body: "Unauthorized" };
  }

  try {
    // 1) Remove prior connections for this user (optional policy)
    const existing = await dynamoDb.query({
      TableName: process.env.CONNECTIONS_TABLE,
      IndexName: "userId-sessionId-index",
      KeyConditionExpression: "userId = :u",
      ExpressionAttributeValues: { ":u": userId }
    }).promise();

    if (existing.Items?.length) {
      await Promise.all(
        existing.Items.map((conn) =>
          dynamoDb.delete({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: conn.connectionId }
          }).promise()
        )
      );
    }

    // 2) Save new connection (omit undefined fields)
    const item = {
      connectionId,
      userId,
      connectedAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };
    if (sessionId) item.sessionId = sessionId;

    await dynamoDb.put({
      TableName: process.env.CONNECTIONS_TABLE,
      Item: item
    }).promise();

    console.log(`✅ Connection ${connectionId} saved for user ${userId} (session: ${sessionId || "none"})`);
    return {
      statusCode: 200,
      body: "Connected.",
      headers: { "Sec-WebSocket-Protocol": selected || rawProto || "" }
    };
  } catch (err) {
    console.error("❌ Error in $connect:", err);
    // This 500 is what causes the browser's generic "failed" during handshake
    return { statusCode: 500, body: "Failed to connect." };
  }
};
