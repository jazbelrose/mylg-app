import AWS from "aws-sdk";
const ddb = new AWS.DynamoDB.DocumentClient();

const headers = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,GET",
};

export const handler = async (event) => {
  // CORS pre‐flight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return { statusCode: 400, headers, body: "Missing userId" };
  }

  try {
    // 1) Pull thread summaries
    const threadRes = await ddb.query({
      TableName:              process.env.THREADS_TABLE_NAME,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: {
        ":uid": userId
      }
    }).promise();

    const threads = threadRes.Items || [];

    if (threads.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }

    // 2) Prepare keys to fetch the full message item for each thread
    const messageKeys = threads.map(t => ({
      conversationId: t.conversationId,
      messageId:      `MESSAGE#${t.lastMsgTs}`
    }));

    // 3) Batch‐get those messages
    const batchRes = await ddb.batchGet({
      RequestItems: {
        [process.env.DM_TABLE_NAME]: {
          Keys: messageKeys
        }
      }
    }).promise();

    const msgs = batchRes.Responses?.[process.env.DM_TABLE_NAME] || [];

    // 4) Build a lookup map by conversationId
    const msgMap = msgs.reduce((acc, m) => {
      acc[m.conversationId] = m;
      return acc;
    }, {});

    // 5) Merge threads + messages
    const inbox = threads
      .map(t => {
        const full = msgMap[t.conversationId] || {};
        return {
          conversationId: t.conversationId,
          lastMsgTs:      t.lastMsgTs,
          snippet:        t.snippet,
          read:           t.read,
          otherUserId:    t.otherUserId,
          // these come from the actual DM item
          senderId:       full.senderId,
          text:           full.text
        };
      })
      // 6) Sort newest first
      .sort((a, b) => new Date(b.lastMsgTs) - new Date(a.lastMsgTs));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(inbox)
    };

  } catch (err) {
    console.error("❌ getDmInbox error:", err);
    return { statusCode: 500, headers, body: "Internal error" };
  }
};
