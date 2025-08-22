/**
 * Lambda: WebSocketDefaultHandler
 * Route: WS $default
 * Auth: API Gateway WebSocket (connection-based)
 * Input: { action: string, ...payload }
 * Output: { ack: true } or error via WebSocket
 * Side effects: manages real-time messaging, notifications, connection state
 */

import AWS from "aws-sdk";
import { randomUUID } from "crypto";
import { v4 as uuid } from 'uuid';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const apigwManagementApi = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT,
});
const threadsTable = process.env.THREADS_TABLE_NAME || process.env.DM_THREADS_TABLE;
const notificationsTable = process.env.NOTIFICATIONS_TABLE;

export const handler = async (event) => {
  console.log("📩 Received WS Message:", JSON.stringify(event, null, 2));

  let payload;
  try {
    payload = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    console.log("📦 Parsed Payload:", payload);
  } catch (err) {
    console.error("❌ Invalid JSON:", err);
    return { statusCode: 400, body: "Invalid JSON payload" };
  }

  const { action } = payload;
  if (!action) return { statusCode: 400, body: "Missing action" };

  switch (action) {
    case "sendMessage":
      return await handleSendMessage(payload);
      case "markRead":
    return await handleMarkRead(payload);
    case "deleteMessage":
      return await handleDeleteMessage(payload);
    case "editMessage":
      return await handleEditMessage(payload);
    case "toggleReaction":
      return await handleToggleReaction(payload);

    case "ping":
    case "presencePing":
      return await handlePresencePing(event);
    case "timelineUpdate":
    case "timelineDelete":
      return await handleTimelineUpdate(payload);
    case "setActiveConversation":
      return await handleSetActiveConversation(event, payload);
    case "timelineUpdated":
      return await handleTimelineUpdated(payload);
    case "projectUpdated":
      return await handleProjectUpdated(payload);
    case "budgetUpdated":
      return await handleBudgetUpdated(payload);
    case "lineLocked":
      return await handleLineLocked(payload);
    case "lineUnlocked":
      return await handleLineUnlocked(payload);
    case 'fetchNotifications': {
      const connectionId = event.requestContext.connectionId;
      const userId = event.requestContext.authorizer.userId;

      const result = await dynamoDb.query({
        TableName: process.env.NOTIFICATIONS_TABLE,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId },
        ScanIndexForward: false,
        Limit: 100,
      }).promise();

      await apigwManagementApi.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          action: 'notificationsBatch',
          items: result.Items,
        }),
      }).promise();

      return { statusCode: 200 };
    }
    default:
      console.warn("⚠️ Unknown action:", action);
      return { statusCode: 400, body: `Unknown action: ${action}` };
  }
};

const handleSetActiveConversation = async (event, payload) => {
  const connectionId = event.requestContext.connectionId;
  const { conversationId } = payload;

  if (!connectionId || !conversationId) {
    console.warn("⚠️ Missing connectionId or conversationId");
    return { statusCode: 400, body: "Missing connectionId or conversationId" };
  }

  try {
    await dynamoDb.update({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { connectionId },
      UpdateExpression: "SET activeConversation = :c",
      ExpressionAttributeValues: {
        ":c": conversationId.trim(),
      },
    }).promise();

    console.log(`✅ Set activeConversation for ${connectionId} → ${conversationId}`);
    return { statusCode: 200, body: "Active conversation set" };
  } catch (err) {
    console.error("❌ Failed to set active conversation:", err);
    return { statusCode: 500, body: "DB update error" };
  }
};

const broadcastToConversation = async (conversationId, payload) => {
  try {
    const data = await dynamoDb.scan({ TableName: process.env.CONNECTIONS_TABLE }).promise();
    const connections = data.Items || [];

    console.log("🔍 All connections:", connections.map(c => ({ id: c.connectionId, active: c.activeConversation })));
    console.log("📤 Broadcasting to conversationId:", conversationId);

    const convIdTrim = (conversationId || "").trim();
    const recipients = connections.filter(c => (c.activeConversation || "").trim() === convIdTrim);

    if (recipients.length === 0) {
      console.warn("⚠️ No active connections for", convIdTrim);
    }

    const stale = [];

    await Promise.allSettled(
      recipients.map(async ({ connectionId }) => {
        console.log(`👉 postToConnection → ${connectionId}`);
        try {
          await apigwManagementApi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify(payload),
          }).promise();
        } catch (err) {
          if (err.statusCode === 410) stale.push(connectionId);
          else console.error("❌ WS send failed", err);
        }
      })
    );

    if (stale.length) {
      console.log("🧹 Cleaning stale connections:", stale);
      await Promise.allSettled(
        stale.map(id =>
          dynamoDb.delete({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: id },
          }).promise()
        )
      );
    }
  } catch (err) {
    console.error("❌ broadcastToConversation error:", err);
  }
};

async function broadcastToUser(userId, payload) {
  const data = await dynamoDb.scan({ TableName: process.env.CONNECTIONS_TABLE }).promise();
  const userConns = (data.Items || [])
    .filter(c => c.userId === userId)
    .map(c => c.connectionId);

  await Promise.allSettled(
    userConns.map(connId =>
      apigwManagementApi.postToConnection({
        ConnectionId: connId,
        Data: JSON.stringify(payload),
      }).promise()
    )
  );
}


async function saveNotification(userId, message, dedupeId, timestamp, senderId, projectId) {
  if (!notificationsTable) {
    console.log('ℹ️ NOTIFICATIONS_TABLE not set; skipping saveNotification');
    return;
  }
  try {
    const existing = await dynamoDb.query({
      TableName: notificationsTable,
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
      ScanIndexForward: false,
      Limit: 5,
    }).promise();

    if (existing.Items && existing.Items.some(n => n.dedupeId === dedupeId)) {
      console.log('🔁 Duplicate notification skipped');
      return;
    }

    const ts = timestamp || new Date().toISOString(); 
    const sortKeyValue = `${ts}#${randomUUID()}`;
    const item = {
      userId,
      "timestamp#uuid": sortKeyValue,
      timestamp: ts,
      dedupeId,
      message,
      read: false,
      senderId,       // <-- Store senderId
      projectId,
    };

    await dynamoDb.put({
      TableName: notificationsTable,
      Item: item,
    }).promise();

    await broadcastToUser(userId, {
      action: 'notification',
      ...item  
    });

  } catch (err) {
    console.error('❌ saveNotification error', err);
  }
}


async function saveProjectNotifications(projectId, message, dedupeId, senderId = null) {
  if (!notificationsTable) {
    console.log('ℹ️ NOTIFICATIONS_TABLE not set; skipping saveProjectNotifications');
    return;
  }

  try {
    const res = await dynamoDb.get({
      TableName: process.env.PROJECTS_TABLE_NAME,
      Key: { projectId },
    }).promise();

    const teamArr = Array.isArray(res.Item?.team)
      ? res.Item.team.map(t => t.userId)
      : [];

    if (senderId) {
      teamArr.push(senderId); // ensure sender is included even if not in team
    }

    const recipients = Array.from(new Set(teamArr));
    const timestamp = new Date().toISOString();

    console.log(`📝 Saving notifications for project ${projectId}:`, recipients);

    await Promise.all(
      recipients.map(uid =>
        saveNotification(uid, message, dedupeId, timestamp, senderId, projectId)
      )
    );
  } catch (err) {
    console.error('❌ saveProjectNotifications error', err);
  }
}

async function deleteNotificationsByDedupeId(dedupeId) {
  if (!dedupeId) {
    console.error("❌ deleteNotificationsByDedupeId: missing dedupeId");
    return;
  }

  try {
    console.log(`🗑 deleteNotificationsByDedupeId called with dedupeId=${dedupeId}`);

    // 1) Query the GSI
    const { Items = [] } = await dynamoDb.query({
      TableName: notificationsTable,
      IndexName: 'dedupeId-index',           // exact name from your CLI
      KeyConditionExpression: 'dedupeId = :d',
      ExpressionAttributeValues: { ':d': dedupeId },

      // correct way to project "timestamp#uuid"
      ProjectionExpression: 'userId, #ts',
      ExpressionAttributeNames: { '#ts': 'timestamp#uuid' }
    }).promise();

    console.log(`🗑 GSI query returned ${Items.length} items:`, Items);

    if (Items.length === 0) {
      console.warn('⚠️ No items found in GSI for that dedupeId');
      // (optional) fall back to a scan here if you want to verify the data really exists
      return;
    }

    // 2) Batch-delete
    const deleteRequests = Items.map(item => ({
      DeleteRequest: {
        Key: {
          userId: item.userId,
          'timestamp#uuid': item['timestamp#uuid']
        }
      }
    }));

    while (deleteRequests.length) {
      const batch = deleteRequests.splice(0, 25);
      await dynamoDb.batchWrite({ RequestItems: { [notificationsTable]: batch } }).promise();
    }

    console.log(`✅ Deleted ${Items.length} notifications for dedupeId=${dedupeId}`);
  } catch (err) {
    console.error('❌ deleteNotificationsByDedupeId error:', err);
  }
}



const handleSendMessage = async (payload) => {
  const { conversationType, conversationId, senderId, username, text, timestamp, title } = payload;



  if (!conversationType || !conversationId || !senderId || !text || !timestamp) {
    console.error("❌ Missing required message fields");
    return { statusCode: 400, body: "Missing required fields" };
  }

  let tableName;
  if (conversationType === "dm") {
    tableName = process.env.DM_TABLE_NAME;
  } else if (conversationType === "project") {
    tableName = process.env.PROJECT_MESSAGES_TABLE_NAME;
  } else {
    console.error("❌ Invalid conversation type:", conversationType);
    return { statusCode: 400, body: "Invalid conversation type" };
  }

  // Always sort the two user IDs to create consistent conversationId
  let finalConversationId = conversationId;
  if (conversationType === "dm") {
    const sortedIds = conversationId.replace("dm#", "").split("___").sort();
    finalConversationId = `dm#${sortedIds.join("___")}`;
  }

  // Identify the recipient for GSI use
  const [uid1, uid2] = finalConversationId.replace("dm#", "").split("___");
  const recipientId = senderId === uid1 ? uid2 : uid1;

  const messageItem = {
    messageId: `MESSAGE#${timestamp}`,
    senderId,
    username: payload.username,
    text,
    timestamp,
    conversationId: finalConversationId,
    GSI1PK: `USER#${recipientId}`,
    GSI1SK: timestamp,
    optimisticId: payload.optimisticId || undefined,
    reactions: {},
  };

  if (conversationType === "project") {
    messageItem.projectId = finalConversationId.replace("project#", "");
  }

  try {
    await dynamoDb.put({
      TableName: tableName,
      Item: messageItem,
    }).promise();

    console.log("✅ Message saved to DB with GSI:", messageItem);

    if (conversationType === "dm" && threadsTable) {
      const threadUpdateSender = {
        TableName: threadsTable,
        Key: { userId: senderId, conversationId: finalConversationId },
        UpdateExpression: `SET lastMsgTs = :ts, snippet = :snip, otherUserId = :other, #r = :true`,
        ExpressionAttributeNames: { '#r': 'read' },
        ExpressionAttributeValues: {
          ':ts': timestamp,
          ':snip': text,
          ':other': recipientId,
          ':true': true,
        },
      };

      const threadUpdateRecipient = {
        TableName: threadsTable,
        Key: { userId: recipientId, conversationId: finalConversationId },
        UpdateExpression: `SET lastMsgTs = :ts, snippet = :snip, otherUserId = :other, #r = :false`,
        ExpressionAttributeNames: { '#r': 'read' },
        ExpressionAttributeValues: {
          ':ts': timestamp,
          ':snip': text,
          ':other': senderId,
          ':false': false,
        },
      };

      try {
        await Promise.all([
          dynamoDb.update(threadUpdateSender).promise(),
          dynamoDb.update(threadUpdateRecipient).promise(),
        ]);
        console.log('✅ Threads updated');
      } catch (threadErr) {
        console.error('❌ Failed to update threads', threadErr);
      }
    }
  } catch (err) {
    console.error("❌ Error writing message to DB:", err);
    return { statusCode: 500, body: "DB write error" };
  }
  
if (conversationType === "project") {
  await broadcastToConversation(finalConversationId, {
    action: "newMessage",
    conversationType,
    ...messageItem,
  });

  const projectId = finalConversationId.replace("project#", "");
  const projectName = title || projectId; // fallback if title not passed

 const senderName = username || senderId;

const isFile = (messageItem.attachments || []).length > 0;
const summary = isFile
  ? `📎 ${senderName} uploaded ${messageItem.attachments.length} file(s) in "${projectName}"`
  : `💬 ${senderName} in "${projectName}": ${text.length > 60 ? text.slice(0, 57) + "..." : text}`;



  await saveProjectNotifications(
    projectId,
    summary,
    messageItem.messageId,
    senderId
  );

  return { statusCode: 200, body: "Project message sent" };
}

  await Promise.all([
    
 broadcastToUser(uid1, {
   action:           "newMessage",
   conversationType: "dm",
   ...messageItem
 }),
 broadcastToUser(uid2, {
   action:           "newMessage",
   conversationType: "dm",
   ...messageItem
 }),

  ]);

  return { statusCode: 200, body: "Message sent successfully" };
};

const handleMarkRead = async ({ conversationType, conversationId, userId, read }) => {
  if (conversationType !== "dm") {
    return { statusCode: 400, body: "Invalid conversationType" };
  }

  // Extract the two participants
  const [uid1, uid2] = conversationId.replace("dm#", "").split("___");

  // Broadcast read-state to both users
  await Promise.all([
    broadcastToUser(uid1, {
      action:           "markRead",
      conversationType: "dm",
      conversationId,
      userId,
      read,
    }),
    broadcastToUser(uid2, {
      action:           "markRead",
      conversationType: "dm",
      conversationId,
      userId,
      read,
    }),
  ]);

  return { statusCode: 200, body: "Read state broadcasted" };
};


// Broadcast a deleteMessage event to all clients in the conversation so
// each participant can remove the message from their UI.
const handleDeleteMessage = async (payload) => {
  const { conversationType, conversationId, messageId } = payload;
  if (!conversationType || !conversationId || !messageId) {
    console.error("❌ Missing conversationType, conversationId or messageId");
    return { statusCode: 400, body: "Missing fields" };
  }

  const eventPayload = {
    action: "deleteMessage",
    conversationType,
    conversationId,
    messageId,
  };

  if (conversationType === "dm") {
    const [uid1, uid2] = conversationId.replace("dm#", "").split("___");
    await Promise.all([
      broadcastToUser(uid1, eventPayload),
      broadcastToUser(uid2, eventPayload),
      broadcastToConversation(conversationId, eventPayload),
    ]);
  } else if (conversationType === "project") {
    await broadcastToConversation(conversationId, eventPayload);
    await deleteNotificationsByDedupeId(messageId, notificationsTable);
  } else {
    console.error("❌ Invalid conversationType for deleteMessage:", conversationType);
    return { statusCode: 400, body: "Invalid conversationType" };
  }

  return { statusCode: 200, body: "Delete broadcasted" };
};

// Broadcast an editMessage event to all clients in the conversation so
// the edited content shows up in real time.
const handleEditMessage = async (payload) => {
  const { conversationType, conversationId, messageId, text, editedAt, editedBy, timestamp, projectId } = payload;
  if (!conversationType || !conversationId || !messageId || !text) {
    console.error("❌ Missing required fields for editMessage");
    return { statusCode: 400, body: "Missing fields" };
  }

  const eventPayload = {
    action: 'editMessage',
    conversationType,
    conversationId,
    messageId,
    text,
    editedAt: editedAt || new Date().toISOString(),
    editedBy,
    timestamp,
    projectId,
  };

  if (conversationType === 'dm') {
    const [uid1, uid2] = conversationId.replace('dm#', '').split('___');
    await Promise.all([
      broadcastToUser(uid1, eventPayload),
      broadcastToUser(uid2, eventPayload),
      broadcastToConversation(conversationId, eventPayload),
    ]);
  } else if (conversationType === 'project') {
    await broadcastToConversation(conversationId, eventPayload);
  } else {
    console.error('❌ Invalid conversationType for editMessage:', conversationType);
    return { statusCode: 400, body: 'Invalid conversationType' };
  }

  return { statusCode: 200, body: 'Edit broadcasted' };
};

// Toggle a reaction on a message and broadcast the updated reactions map
const handleToggleReaction = async (payload) => {
  const { conversationType, conversationId, messageId, emoji, userId } = payload;

  if (!conversationType || !conversationId || !messageId || !emoji || !userId) {
    console.error('❌ Missing fields for toggleReaction');
    return { statusCode: 400, body: 'Missing fields' };
  }

  let tableName;
  let key;
  if (conversationType === 'dm') {
    tableName = process.env.DM_TABLE_NAME;
    key = { conversationId, messageId };
  } else if (conversationType === 'project') {
    tableName = process.env.PROJECT_MESSAGES_TABLE_NAME;
    const projectId = conversationId.replace('project#', '');
    key = { projectId, messageId };
  } else {
    console.error('❌ Invalid conversationType for toggleReaction:', conversationType);
    return { statusCode: 400, body: 'Invalid conversationType' };
  }

  let item;
  try {
    const res = await dynamoDb.get({ TableName: tableName, Key: key }).promise();
    item = res.Item;
    if (!item) return { statusCode: 404, body: 'Message not found' };
  } catch (err) {
    console.error('❌ Failed to fetch message for toggleReaction', err);
    return { statusCode: 500, body: 'DB get error' };
  }

  const reactions = { ...(item.reactions || {}) };
  const users = new Set(reactions[emoji] || []);
  if (users.has(userId)) {
    users.delete(userId);
  } else {
    users.add(userId);
  }
  if (users.size > 0) reactions[emoji] = Array.from(users);
  else delete reactions[emoji];

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: key,
      UpdateExpression: 'SET reactions = :r',
      ExpressionAttributeValues: { ':r': reactions },
    }).promise();
  } catch (err) {
    console.error('❌ Failed to update reactions', err);
    return { statusCode: 500, body: 'DB update error' };
  }

  const eventPayload = {
    action: 'toggleReaction',
    conversationType,
    conversationId,
    messageId,
    reactions,
    projectId: key.projectId,
  };

  if (conversationType === 'dm') {
    const [uid1, uid2] = conversationId.replace('dm#', '').split('___');
    await Promise.all([
      broadcastToUser(uid1, eventPayload),
      broadcastToUser(uid2, eventPayload),
      broadcastToConversation(conversationId, eventPayload),
    ]);
  } else {
    await broadcastToConversation(conversationId, eventPayload);
  }

  return { statusCode: 200, body: 'Reaction toggled' };
};


const handlePresencePing = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.requestContext.authorizer?.userId;

  if (!connectionId || !userId) {
    console.warn("⚠️ Missing connectionId or userId in presencePing");
    return { statusCode: 400, body: "Missing connection/user info" };
  }

  const newTTL = Math.floor(Date.now() / 1000) + 10 * 60; // Extend to 10 minutes
  const currentTime = new Date().toISOString();

  try {
    // Update connection with ping timestamp and extended TTL
    await dynamoDb.update({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { connectionId },
      UpdateExpression: "SET expiresAt = :exp, lastPing = :pingTime, connectionHealthy = :healthy",
      ConditionExpression: "attribute_exists(connectionId)",
      ExpressionAttributeValues: {
        ":exp": newTTL,
        ":pingTime": currentTime,
        ":healthy": true,
      },
    }).promise();

    console.log(`📶 Presence updated: ${connectionId} at ${currentTime}`);

    // Send immediate pong response to client
    try {
      await apigwManagementApi.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({ 
          type: "pong", 
          timestamp: currentTime,
          status: "healthy"
        }),
      }).promise();
    } catch (pongError) {
      console.error(`Failed to send pong to ${connectionId}:`, pongError);
    }

    // Get active connections (filter out expired ones)
    const now = Math.floor(Date.now() / 1000);
    const result = await dynamoDb.scan({
      TableName: process.env.CONNECTIONS_TABLE,
      ProjectionExpression: "connectionId, userId, expiresAt, lastPing",
      FilterExpression: "expiresAt > :now",
      ExpressionAttributeValues: { ":now": now }
    }).promise();

    const staleConnections = [];
    const activeConnections = result.Items.filter(item => {
      if (!item.expiresAt || item.expiresAt <= now) {
        staleConnections.push(item.connectionId);
        return false;
      }
      return true;
    });

    // Clean up stale connections
    if (staleConnections.length > 0) {
      console.log(`🧹 Cleaning ${staleConnections.length} stale connections`);
      await Promise.allSettled(
        staleConnections.map(staleId =>
          dynamoDb.delete({ 
            TableName: process.env.CONNECTIONS_TABLE, 
            Key: { connectionId: staleId } 
          }).promise()
        )
      );
    }

    const uniqueUsers = Array.from(new Set(activeConnections.map(item => item.userId)));
    const onlineUsersPayload = { type: "onlineUsers", users: uniqueUsers };

    // Broadcast online users to active connections only
    await Promise.allSettled(
      activeConnections.map(({ connectionId: connId }) =>
        apigwManagementApi.postToConnection({
          ConnectionId: connId,
          Data: JSON.stringify(onlineUsersPayload),
        }).promise().catch(err => {
          if (err.statusCode === 410) {
            console.log(`🧹 Connection ${connId} is stale, will be cleaned up`);
            dynamoDb.delete({ 
              TableName: process.env.CONNECTIONS_TABLE, 
              Key: { connectionId: connId } 
            }).promise();
          } else {
            console.error(`Failed to broadcast to ${connId}:`, err);
          }
        })
      )
    );

    return { statusCode: 200, body: JSON.stringify({ 
      status: "pong",
      timestamp: currentTime,
      activeConnections: activeConnections.length,
      onlineUsers: uniqueUsers.length
    }) };
  } catch (err) {
    if (err.code === "ConditionalCheckFailedException") {
      console.warn(`⚠️ Connection record missing for ${connectionId}, user may need to reconnect`);
      return { statusCode: 404, body: "Connection not found" };
    }
    console.error("❌ Failed to update presence TTL or broadcast:", err);
    return { statusCode: 500, body: "Presence update error" };
  }
};

const handleTimelineUpdate = async ({ conversationType, conversationId, events, action }) => {
  if (conversationType !== "project" || !conversationId || !Array.isArray(events)) {
    console.error("❌ Invalid timeline payload", { conversationType, conversationId, events });
    return { statusCode: 400, body: "Invalid timeline payload" };
  }

  await broadcastToConversation(conversationId, {
    action,
    conversationType,
    conversationId,
    events,
  });

  return { statusCode: 200, body: "Timeline broadcasted" };
};

const handleTimelineUpdated = async (payload) => {
  const { projectId, title, events = [], conversationId, username, senderId } = payload;

  if (!projectId || !Array.isArray(events)) {
    return { statusCode: 400, body: 'Missing projectId or events' };
  }

  console.log('📬 handleTimelineUpdated triggered with:', payload);

  const newEvents = events.map(ev => ({
    id: ev.id || uuid(),
    date: ev.date,
    description: ev.description,
    hours: ev.hours,
    budgetItemId: ev.budgetItemId,
  }));

let prevEvents = [];
  try {
    const res = await dynamoDb.query({
      TableName: process.env.EVENTS_TABLE_NAME || 'Events',
      KeyConditionExpression: 'projectId = :p',
      ExpressionAttributeValues: { ':p': projectId },
    }).promise();
    prevEvents = Array.isArray(res.Items) ? res.Items : [];
  } catch (err) {
    console.error('❌ Failed fetching previous events', err);
  }

  const prevById = new Map(prevEvents.map(ev => [ev.id, ev]));
  const nextById = new Map(newEvents.map(ev => [ev.id, ev]));
  let added, updated, removed;

  for (const [id, ev] of nextById.entries()) {
    if (!prevById.has(id)) {
      added = ev;
      break;
    }
    const prev = prevById.get(id);
    if (prev.date !== ev.date || prev.description !== ev.description || String(prev.hours) !== String(ev.hours)) {
      updated = ev;
      break;
    }
  }

  if (!added && !updated) {
    for (const [id, ev] of prevById.entries()) {
      if (!nextById.has(id)) {
        removed = ev;
        break;
      }
    }
  }

  console.log('🔎 timeline diff result', { added, updated, removed });

  try {
    const deleteReqs = prevEvents.map(ev => ({
      DeleteRequest: { Key: { projectId, eventId: ev.eventId || ev.id } },
    }));
    const putReqs = newEvents.map(ev => ({
      PutRequest: { Item: { ...ev, projectId, eventId: ev.id } },
    }));
    const batches = [...deleteReqs, ...putReqs];
    for (let i = 0; i < batches.length; i += 25) {
      const chunk = batches.slice(i, i + 25);
      await dynamoDb.batchWrite({
        RequestItems: { [process.env.EVENTS_TABLE_NAME || 'Events']: chunk },
      }).promise();
    }
  } catch (err) {
    console.error('❌ Failed to persist timeline events', err);
  }

  const wsPayload = {
    action: 'timelineUpdated',
    projectId,
    events: newEvents,
  };
  await broadcastToConversation(conversationId, wsPayload);

  const sendNotification = async (action, ev) => {
    const msg = `${username || 'Someone'} ${action} "${ev.description}" in "${title || projectId}" ${ev.date} `;
    const dedupe = `timeline#${projectId}#${action}#${ev.id}`;
    await saveProjectNotifications(projectId, msg, dedupe, senderId, username); 
  };

  if      (added)   await sendNotification('added', added);
  else if (updated) await sendNotification('updated', updated);
  else if (removed) await sendNotification('removed', removed);
  else              await sendNotification('modified', newEvents[0]);

  return { statusCode: 200, body: 'timeline broadcast' };
};



const handleProjectUpdated = async (payload) => {
  const { projectId, title, fields, conversationId, username, senderId } = payload;

  if (!projectId || !fields) {
    return { statusCode: 400, body: 'Missing projectId or fields' };
  }

  await broadcastToConversation(conversationId, {
    action: 'projectUpdated',
    projectId,
    fields,
  });

  const formatValue = (key, value) => {
    if (key === 'budget' && value && typeof value === 'object') {
      const total = value.total ? `$${Number(value.total).toLocaleString()}` : null;
      const date = value.date || null;
      return [total, date].filter(Boolean).join(' on ');
    }
    if (Array.isArray(value)) {
      return value.map(v => String(v).replace(/\n/g, ' ')).join(', ');
    }
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const entries = Object.entries(fields);
  const readableChanges = entries
    .map(([key, value]) => `${key}: ${formatValue(key, value)}`)
    .join(' | ');

  const displayName = title || projectId;
  const sender = username || 'Someone';
  const msg = `${sender} updated ${displayName} → ${readableChanges}`;

  const projectDedupe = `project#${projectId}#${Date.now()}`;
  // 🚩 Pass senderId and username into notifications for use downstream!
  await saveProjectNotifications(projectId, msg, projectDedupe, senderId, username);

  return { statusCode: 200, body: 'project update broadcast' };
};

const handleBudgetUpdated = async (payload) => {
  const { projectId, title, revision, total, conversationId, username, senderId } = payload;

  if (!projectId) {
    return { statusCode: 400, body: 'Missing projectId' };
  }

  await broadcastToConversation(conversationId, {
    action: 'budgetUpdated',
    projectId,
    revision,
    total,
  });

  const totalStr = total ? `$${Number(total).toLocaleString()}` : 'N/A';
  const displayName = title || projectId;
  const revPart = revision ? `revision ${revision} ` : '';
  const sender = username || 'Someone';
  const msg = `${sender} updated budget ${revPart}for "${displayName}" → ${totalStr}`;

  const windowMinutes = parseInt(process.env.BUDGET_NOTIF_WINDOW_MINUTES, 10) || 10;
  const bucket = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
  const actionType = 'update';
  const dedupeId = `budget#${projectId}#${revision || 'unknown'}#${actionType}#${bucket}`;

  await saveProjectNotifications(projectId, msg, dedupeId, senderId, username);

  return { statusCode: 200, body: 'budget update broadcast' };
};

const handleLineLocked = async (payload) => {
  const { projectId, lineId, revision, conversationId } = payload;

  if (!projectId || !lineId) {
    return { statusCode: 400, body: 'Missing projectId or lineId' };
  }

  await broadcastToConversation(conversationId, {
    action: 'lineLocked',
    projectId,
    lineId,
    revision,
  });

  return { statusCode: 200, body: 'lineLocked broadcast' };
};

const handleLineUnlocked = async (payload) => {
  const { projectId, lineId, revision, conversationId } = payload;

  if (!projectId || !lineId) {
    return { statusCode: 400, body: 'Missing projectId or lineId' };
  }

  await broadcastToConversation(conversationId, {
    action: 'lineUnlocked',
    projectId,
    lineId,
    revision,
  });

  return { statusCode: 200, body: 'lineUnlocked broadcast' };
};
