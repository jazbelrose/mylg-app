/** @jest-environment node */
import { handler, dynamo } from '../../lambdas/respondProjectInvitation/index.mjs';
import * as membership from '../../lambdas/postProjectToUserId/index.mjs';

beforeEach(() => {
  dynamo.get = jest.fn();
  dynamo.delete = jest.fn().mockResolvedValue({});
  membership.updateMembership = jest.fn();
});

test('accept invite adds membership and deletes invite', async () => {
  dynamo.get.mockResolvedValue({ Item: { inviteId: 'i1', projectId: 'p1', recipientId: 'u1' } });
  const event = { httpMethod: 'POST', body: JSON.stringify({ inviteId: 'i1', action: 'accept' }) };
  await handler(event);
  expect(membership.updateMembership).toHaveBeenCalledWith('u1', 'p1', 'add');
  expect(dynamo.delete).toHaveBeenCalledWith({ TableName: 'ProjectInvitations', Key: { inviteId: 'i1' } });
});

test('decline invite only deletes record', async () => {
  dynamo.get.mockResolvedValue({ Item: { inviteId: 'i2', projectId: 'p2', recipientId: 'u2' } });
  const event = { httpMethod: 'POST', body: JSON.stringify({ inviteId: 'i2', action: 'decline' }) };
  await handler(event);
  expect(membership.updateMembership).not.toHaveBeenCalled();
  expect(dynamo.delete).toHaveBeenCalledWith({ TableName: 'ProjectInvitations', Key: { inviteId: 'i2' } });
});