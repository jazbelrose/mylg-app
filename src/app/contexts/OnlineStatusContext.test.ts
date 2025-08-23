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

const { useSocket } = require('./SocketContext') as { useSocket: jest.MockedFunction<any> };
const { useData } = require('./DataProvider') as { useData: jest.MockedFunction<any> };

interface MockWebSocketOptions {
    listeners: Record<string, (event: any) => void>;
    send: jest.MockedFunction<any>;
}

class MockWebSocket implements MockWebSocketOptions {
    listeners: Record<string, (event: any) => void>;
    send: jest.MockedFunction<any>;
    
    constructor() {
        this.listeners = {};
        this.send = jest.fn();
    }
    
    addEventListener(event: string, cb: (event: any) => void) {
        this.listeners[event] = cb;
    }
    
    removeEventListener(event: string) {
        delete this.listeners[event];
    }
    
    fireMessage(data: any) {
        if (this.listeners['message']) {
            this.listeners['message']({ data });
        }
    }
}
describe('OnlineStatusContext', () => {
    let ws: MockWebSocket;
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
        render(<OnlineStatusProvider><TestComponent /></OnlineStatusProvider>);
        expect(screen.getByTestId('users')).toHaveTextContent('a,b,current');
    });
    it('child components show indicator when user is online', () => {
        useSocket.mockReturnValue({ ws, onlineUsers: ['user1'] });
        const Indicator = ({ id }: { id: string }) => {
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
