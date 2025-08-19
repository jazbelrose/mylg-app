/** @jest-environment node */
import { updateMembership, dynamo } from '../../backend/lambdas/postProjectToUserId/index.mjs';

beforeEach(() => {
  dynamo.get = jest.fn();
  dynamo.transactWrite = jest.fn().mockResolvedValue({});
});

describe('updateMembership', () => {
  it('adds project to user and user to project', async () => {
    dynamo.get
      .mockResolvedValueOnce({ Item: { projects: ['p1'] } })
      .mockResolvedValueOnce({ Item: { team: [{ userId: 'u2' }] } });

    await updateMembership('u1', 'newP', 'add');

    expect(dynamo.transactWrite).toHaveBeenCalledTimes(1);
    const params = dynamo.transactWrite.mock.calls[0][0];
    const userUpdate = params.TransactItems[0].Update;
    const projectUpdate = params.TransactItems[1].Update;
    expect(userUpdate.ExpressionAttributeValues[':projects']).toEqual(['p1', 'newP']);
    expect(projectUpdate.ExpressionAttributeValues[':team']).toEqual([{ userId: 'u2' }, { userId: 'u1' }]);
  });

  it('removes project from user and user from project', async () => {
    dynamo.get
      .mockResolvedValueOnce({ Item: { projects: ['p1', 'old'] } })
      .mockResolvedValueOnce({ Item: { team: [{ userId: 'u1' }, { userId: 'u2' }] } });

    await updateMembership('u1', 'old', 'remove');

    const params = dynamo.transactWrite.mock.calls[0][0];
    const userProjects = params.TransactItems[0].Update.ExpressionAttributeValues[':projects'];
    const team = params.TransactItems[1].Update.ExpressionAttributeValues[':team'];
    expect(userProjects).toEqual(['p1']);
    expect(team).toEqual([{ userId: 'u2' }]);
  });
});