
/** @jest-environment node */
import { updateMessage, dynamo } from '../editMessage/index.mjs';

describe('updateMessage', () => {
  it('calls DynamoDB with correct parameters', async () => {
    dynamo.update = jest.fn().mockResolvedValue({ Attributes: { text: 'x' } });

    const key = { conversationId: 'c1', messageId: 'm1' };
    const ts = '2020-01-01T00:00:00Z';
    await updateMessage('DMs', key, 'hello', 'u1', ts);

    expect(dynamo.update).toHaveBeenCalledTimes(1);
    const params = dynamo.update.mock.calls[0][0];
    expect(params.TableName).toBe('DMs');
    expect(params.Key).toEqual(key);
    expect(params.ExpressionAttributeValues[':c']).toBe('hello');
    expect(params.ExpressionAttributeValues[':eb']).toBe('u1');
    expect(params.ExpressionAttributeValues[':ts']).toBe(ts);
  });
});