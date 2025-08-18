import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { OnlineStatusProvider, useOnlineStatus } from './OnlineStatusContext';
import '@testing-library/jest-dom';

// Mock useSocket and useData hooks
jest.mock('./SocketContext', () => ({
  useSocket: jest.fn(),
}));

jest.mock('./DataProvider', () => ({
  useData: jest.fn(),
}));

const { useSocket } = require('./SocketContext');
const { useData } = require('./DataProvider');

class MockWebSocket {
  constructor() {
    this.listeners = {};
    this.send = jest.fn();
  }
  addEventListener(event, cb) {
    this.listeners[event] = cb;
  }
  removeEventListener(event) {
    delete this.listeners[event];
  }
  fireMessage(data) {
    if (this.listeners['message']) {
      this.listeners['message']({ data });
    }
  }
}

describe('OnlineStatusContext', () => {
  let ws;
  beforeEach(() => {
    ws = new MockWebSocket();
    useSocket.mockReturnValue({ ws, onlineUsers: [] });
    useData.mockReturnValue({ userData: { userId: 'current' } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates onlineUsers state when receiving payload', async () => {
    useSocket.mockReturnValue({ ws, onlineUsers: ['a', 'b', 'current'] });
    const TestComponent = () => {
      const { onlineUsers } = useOnlineStatus();
      return <div data-testid="users">{onlineUsers.join(',')}</div>;
    };

    render(
      <OnlineStatusProvider>
        <TestComponent />
      </OnlineStatusProvider>
    );

    expect(screen.getByTestId('users')).toHaveTextContent('a,b,current');
  });

  it('child components show indicator when user is online', () => {
    useSocket.mockReturnValue({ ws, onlineUsers: ['user1'] });
    const Indicator = ({ id }) => {
      const { onlineUsers } = useOnlineStatus();
      return onlineUsers.includes(id) ? (
        <span data-testid={`ind-${id}`} className="online-indicator" />
      ) : (
        <span data-testid={`ind-${id}`}>offline</span>
      );
    };

    render(
      <OnlineStatusProvider>
        <Indicator id="user1" />
        <Indicator id="user2" />
      </OnlineStatusProvider>
    );

    expect(screen.getByTestId('ind-user1')).toHaveClass('online-indicator');
    expect(screen.getByTestId('ind-user2')).toHaveTextContent('offline');
  });
});