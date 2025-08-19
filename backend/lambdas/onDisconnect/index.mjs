import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  console.log("🚨 Full disconnect event received:", JSON.stringify(event, null, 2));

  // Check if requestContext exists
  if (!event.requestContext || !event.requestContext.connectionId) {
    console.error("❌ requestContext or connectionId is missing in disconnect event.");
    return { statusCode: 400, body: JSON.stringify(event) }; // Return full event for debugging
  }

  const connectionId = event.requestContext.connectionId;
  console.log(`🛑 Attempting to remove connectionId: ${connectionId}`);

  const params = {
    TableName: process.env.CONNECTIONS_TABLE,
    Key: { connectionId },
  };

  try {
    await dynamoDb.delete(params).promise();
    console.log(`✅ Successfully removed connection: ${connectionId}`);
    return { statusCode: 200, body: "Disconnected successfully." };
  } catch (err) {
    console.error(`❌ Error removing connection ${connectionId}:`, err);
    return { statusCode: 500, body: "Failed to disconnect." };
  }
};
