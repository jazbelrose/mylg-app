import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, act } from '@testing-library/react';
import { SocketProvider } from './SocketContext';
import '@testing-library/jest-dom';
jest.mock('./AuthContext', () => ({
    useAuth: jest.fn(),
}));
jest.mock('./DataProvider', () => ({
    useData: jest.fn(),
}));
jest.mock('./DMConversationContext', () => ({
    useDMConversation: jest.fn(),
}));
const { useAuth } = require('./AuthContext');
const { useData } = require('./DataProvider');
const { useDMConversation } = require('./DMConversationContext');
class MockWebSocket {
    constructor() {
        this.onmessage = null;
        this.onopen = null;
        this.readyState = 1;
        global.mockSocket = this;
    }
    send() { }
    close() { }
}
describe('SocketContext collaborator updates', () => {
    let originalWebSocket;
    beforeEach(() => {
        jest.useFakeTimers();
        originalWebSocket = global.WebSocket;
        global.WebSocket = MockWebSocket;
        useAuth.mockReturnValue({
            getAuthTokens: jest.fn().mockResolvedValue({ idToken: 'token' }),
        });
        useDMConversation.mockReturnValue({ activeDmConversationId: null });
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllTimers();
        jest.clearAllMocks();
        global.WebSocket = originalWebSocket;
        delete global.mockSocket;
    });
    it('debounces refreshUsers and fetchUserProfile calls', async () => {
        const refreshUsers = jest.fn();
        const fetchUserProfile = jest.fn();
        useData.mockReturnValue({
            setUserData: jest.fn(),
            setDmThreads: jest.fn(),
            userId: 'u1',
            setProjects: jest.fn(),
            setUserProjects: jest.fn(),
            setActiveProject: jest.fn(),
            updateProjectFields: jest.fn(),
            setProjectMessages: jest.fn(),
            deletedMessageIds: new Set(),
            markMessageDeleted: jest.fn(),
            activeProject: null,
            fetchProjects: jest.fn(),
            fetchUserProfile,
            refreshUsers,
        });
        render(_jsx(SocketProvider, { children: _jsx("div", {}) }));
        await act(async () => {
            await Promise.resolve();
        });
        act(() => {
            mockSocket.onmessage({ data: JSON.stringify({ type: 'collaborators-updated' }) });
            mockSocket.onmessage({ data: JSON.stringify({ type: 'collaborators-updated' }) });
        });
        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(refreshUsers).toHaveBeenCalledTimes(1);
        expect(fetchUserProfile).toHaveBeenCalledTimes(1);
        act(() => {
            mockSocket.onmessage({ data: JSON.stringify({ type: 'collaborators-updated' }) });
            jest.advanceTimersByTime(1000);
        });
        expect(refreshUsers).toHaveBeenCalledTimes(2);
        expect(fetchUserProfile).toHaveBeenCalledTimes(2);
    });
});
