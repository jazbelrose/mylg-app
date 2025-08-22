// store.cjs
// DynamoDB-backed y-websocket persistence with a safe feature flag.

const Y = require('yjs');

const USE_DDB = process.env.USE_DDB_PERSISTENCE === '1';
let persistence;

if (!USE_DDB) {
  // ---- Fallback: in-memory (current behavior) ----
  class InMemoryPersistence {
    constructor() { this.boundDocs = new Set(); }
    async bindState(name, doc) {
      if (this.boundDocs.has(name)) return { doc, cleanup: () => {} };
      this.boundDocs.add(name);
      return { doc, cleanup: () => {} };
    }
    async writeState(name, doc) {
      console.log(`[persistence] (memory) writeState ${name}`);
    }
  }
  persistence = new InMemoryPersistence();
  module.exports.persistence = persistence;
  return;
}

// ---- DynamoDB-backed persistence ----
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const TABLE = process.env.DDB_TABLE || 'Projects';
const REGION = process.env.AWS_REGION || process.env.DDB_REGION || 'us-west-1';
const PK = process.env.DDB_PROJECT_PK || 'projectId';     // partition key attribute
const DESC_ATTR = process.env.DDB_DESC_ATTR || 'description'; // attribute storing Lexical JSON string

const ddb = new DynamoDBClient({ region: REGION });

// small helper
const utf8Len = (str) => Buffer.byteLength(str || '', 'utf8');

// Debounce util: simple trailing debounce by key
function createDebouncer(delayMs = 3000) {
  const timers = new Map();
  return (key, fn) => {
    if (timers.has(key)) clearTimeout(timers.get(key));
    timers.set(key, setTimeout(async () => {
      timers.delete(key);
      try { await fn(); } catch (e) { console.error(`[persistence] save error for ${key}`, e); }
    }, delayMs));
  };
}
const debounceSave = createDebouncer(Number(process.env.PERSIST_DEBOUNCE_MS || 3000));

class DynamoDbPersistence {
  constructor() { this.bound = new Set(); }

  async _getDescription(projectId) {
    const cmd = new GetItemCommand({
      TableName: TABLE,
      Key: { [PK]: { S: projectId } },
      ProjectionExpression: `#d`,
      ExpressionAttributeNames: { '#d': DESC_ATTR },
    });
    const out = await ddb.send(cmd);
    return out.Item && out.Item[DESC_ATTR] && out.Item[DESC_ATTR].S ? out.Item[DESC_ATTR].S : '';
  }

  async _putDescription(projectId, jsonString) {
    // PutItem for simplicity; if you prefer UpdateExpression, you can swap it.
    const cmd = new PutItemCommand({
      TableName: TABLE,
      Item: {
        [PK]: { S: projectId },
        [DESC_ATTR]: { S: jsonString || '' },
        updatedAt: { S: new Date().toISOString() },
      },
    });
    await ddb.send(cmd);
  }

  /**
   * bindState(name, doc):
   *  - Seed Yjs doc with DynamoDB value if empty
   *  - Register debounced save on doc updates
   */
  async bindState(name, doc) {
    if (this.bound.has(name)) {
      // Already bound in this process
      return { doc, cleanup: () => {} };
    }
    this.bound.add(name);

    const ytext = doc.getText('lexical');

    try {
      const fromDb = await this._getDescription(name);
      const empty = ytext.length === 0;

      if (empty && fromDb && fromDb.trim().length > 0) {
        // IMPORTANT: we store the serialized Lexical JSON as a string in Y.Text.
        // Your client already serializes/deserializes; this matches that model.
        ytext.insert(0, fromDb);
        console.log(`[persistence] seeded ${name} from DynamoDB (${utf8Len(fromDb)} bytes)`);
      } else {
        console.log(`[persistence] no seed needed for ${name} (empty=${empty}, dbLen=${utf8Len(fromDb)})`);
      }
    } catch (e) {
      console.error(`[persistence] failed to seed ${name} from DynamoDB`, e);
    }

    // Debounced save on updates
    const updateHandler = () => {
      debounceSave(name, async () => {
        const current = ytext.toString();
        await this._putDescription(name, current);
        console.log(`[persistence] saved ${name} to DynamoDB (${utf8Len(current)} bytes)`);
      });
    };

    doc.on('update', updateHandler);

    const cleanup = () => {
      try { doc.off('update', updateHandler); } catch {}
      console.log(`[persistence] cleanup ${name}`);
    };

    return { doc, cleanup };
  }

  async writeState(name, doc) {
    // Optional final write; y-websocket may call this on shutdown.
    const ytext = doc.getText('lexical');
    const current = ytext.toString();
    await this._putDescription(name, current);
    console.log(`[persistence] writeState committed ${name} (${utf8Len(current)} bytes)`);
  }
}

persistence = new DynamoDbPersistence();
module.exports.persistence = persistence;
