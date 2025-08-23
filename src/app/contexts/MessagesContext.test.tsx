import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessagesProvider, useMessagesContext } from './MessagesContext';

jest.mock('./AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('../../utils/api', () => ({
    THREADS_URL: 'threads',
    apiFetch: jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue([]),
    }),
}));

jest.mock('../../utils/storageWithTTL', () => ({
    getWithTTL: jest.fn(() => []),
    setWithTTL: jest.fn(),
    DEFAULT_TTL: 3600000,
}));

const { useAuth } = require('./AuthContext');
const api = require('../../utils/api');

const TestComponent: React.FC = () => {
    const { dmThreads, projectMessages, markMessageDeleted, deletedMessageIds } = useMessagesContext();
    
    React.useEffect(() => {
        markMessageDeleted('test-msg-1');
    }, [markMessageDeleted]);
    
    return (
        <div>
            <span data-testid="threads-count">{dmThreads.length}</span>
            <span data-testid="deleted-count">{deletedMessageIds.size}</span>
        </div>
    );
};

describe('MessagesContext', () => {
    beforeEach(() => {
        useAuth.mockReturnValue({ 
            userId: 'u1',
        });
        api.apiFetch.mockResolvedValue({
            json: jest.fn().mockResolvedValue([
                { threadId: 't1', participants: ['u1', 'u2'] },
                { threadId: 't2', participants: ['u1', 'u3'] }
            ]),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('loads DM threads on mount', async () => {
        render(<MessagesProvider><TestComponent /></MessagesProvider>);
        await waitFor(() => {
            expect(screen.getByTestId('threads-count')).toHaveTextContent('2');
        });
        expect(api.apiFetch).toHaveBeenCalledWith('threads?userId=u1');
    });

    it('tracks deleted message IDs', async () => {
        render(<MessagesProvider><TestComponent /></MessagesProvider>);
        await waitFor(() => {
            expect(screen.getByTestId('deleted-count')).toHaveTextContent('1');
        });
    });

    it('provides toggleReaction functionality', () => {
        const TestReactionComponent: React.FC = () => {
            const { toggleReaction } = useMessagesContext();
            const mockWs = { readyState: WebSocket.OPEN, send: jest.fn() } as any;
            
            React.useEffect(() => {
                toggleReaction('msg1', '👍', 'u1', 'conv1', 'dm', mockWs);
            }, [toggleReaction]);
            
            return <span data-testid="reaction-test">done</span>;
        };

        render(<MessagesProvider><TestReactionComponent /></MessagesProvider>);
        expect(screen.getByTestId('reaction-test')).toHaveTextContent('done');
    });
});