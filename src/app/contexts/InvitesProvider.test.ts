import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('./DataProvider', () => ({
  useProjects: jest.fn(),
}));

jest.mock('../../utils/api', () => ({
  fetchPendingInvites: jest.fn(() => Promise.resolve([])),
  sendProjectInvite: jest.fn(),
  acceptProjectInvite: jest.fn(),
  declineProjectInvite: jest.fn(),
  cancelProjectInvite: jest.fn(),
}));

const { useAuth } = require('./AuthContext');
const { useProjects } = require('./DataProvider');
const api = require('../../utils/api');
const { InvitesProvider, useInvites } = require('./InvitesProvider');

const TestComponent: React.FC = () => {
  const { pendingInvites } = useInvites();
  return <span data-testid="count">{pendingInvites.length}</span>;
};

describe('InvitesProvider', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ userId: 'u1' });
    useProjects.mockReturnValue({ fetchProjects: jest.fn() });
    api.fetchPendingInvites.mockResolvedValue([
      { inviteId: '1', projectId: 'p1', recipientUsername: 'r' },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches pending invites on mount', async () => {
    render(
      <InvitesProvider>
        <TestComponent />
      </InvitesProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });
    expect(api.fetchPendingInvites).toHaveBeenCalledWith('u1');
  });
});