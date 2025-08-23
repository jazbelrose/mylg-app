import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('../../utils/storageWithTTL', () => ({
    getWithTTL: jest.fn(() => null),
    setWithTTL: jest.fn(),
    DEFAULT_TTL: 3600000,
}));

jest.mock('../../utils/api', () => ({
    THREADS_URL: 'threads',
    fetchAllUsers: jest.fn(() => Promise.resolve([])),
    fetchUserProfile: jest.fn(() => Promise.resolve({})),
    fetchProjectsFromApi: jest.fn(),
    fetchEvents: jest.fn(() => Promise.resolve([])),
    fetchBudgetHeader: jest.fn(),
    updateTimelineEvents: jest.fn(),
    updateProjectFields: jest.fn(),
    updateUserProfile: jest.fn(),
    apiFetch: jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue([]),
    }),
    GET_PROJECT_MESSAGES_URL: '',
    fetchPendingInvites: jest.fn(() => Promise.resolve([])),
    sendProjectInvite: jest.fn(),
    acceptProjectInvite: jest.fn(),
    declineProjectInvite: jest.fn(),
    cancelProjectInvite: jest.fn(),
}));

const { useAuth } = require('./AuthContext');
const api = require('../../utils/api');
const { DataProvider, useData, useAuthData, useProjects, useMessages } = require('./DataProvider');

const TestComponent: React.FC = () => {
    const { projectsError, fetchProjects, userName, dmThreads } = useData();
    React.useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    return (
        <div>
            <span data-testid="err">{projectsError ? 'true' : 'false'}</span>
            <span data-testid="username">{userName}</span>
            <span data-testid="threads">{dmThreads.length}</span>
        </div>
    );
};

const IndividualContextTestComponent: React.FC = () => {
    const { userName } = useAuthData();
    const { projects } = useProjects();
    const { dmThreads } = useMessages();
    
    return (
        <div>
            <span data-testid="individual-username">{userName}</span>
            <span data-testid="individual-projects">{projects.length}</span>
            <span data-testid="individual-threads">{dmThreads.length}</span>
        </div>
    );
};

describe('DataProvider', () => {
    beforeEach(() => {
        useAuth.mockReturnValue({ 
            user: null, 
            userId: undefined,
            userName: 'Guest',
            isAdmin: false,
            isDesigner: false,
            isBuilder: false,
            isVendor: false,
            isClient: false,
        });
        api.fetchProjectsFromApi.mockRejectedValue(new Error('fail'));
        api.fetchEvents.mockResolvedValue([]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('sets projectsError when project fetch fails', async () => {
        render(<DataProvider><TestComponent /></DataProvider>);
        await waitFor(() => {
            expect(screen.getByTestId('err')).toHaveTextContent('true');
        });
    });

    it('provides merged context data via useData hook', async () => {
        render(<DataProvider><TestComponent /></DataProvider>);
        expect(screen.getByTestId('username')).toHaveTextContent('Guest');
        expect(screen.getByTestId('threads')).toHaveTextContent('0');
    });

    it('provides individual context hooks', async () => {
        render(<DataProvider><IndividualContextTestComponent /></DataProvider>);
        expect(screen.getByTestId('individual-username')).toHaveTextContent('Guest');
        expect(screen.getByTestId('individual-projects')).toHaveTextContent('0');
        expect(screen.getByTestId('individual-threads')).toHaveTextContent('0');
    });

    it('does not hydrate projects with budget data', async () => {
        useAuth.mockReturnValue({ 
            user: { userId: 'u1', role: 'admin', projects: [] },
            userId: 'u1',
            userName: 'Test User',
            isAdmin: true,
            isDesigner: false,
            isBuilder: false,
            isVendor: false,
            isClient: false,
        });
        api.fetchProjectsFromApi.mockResolvedValue([{ projectId: 'p1' }]);
        api.fetchEvents.mockResolvedValue([]);
        
        const BudgetCheck: React.FC = () => {
            const { projects, fetchProjects } = useData();
            React.useEffect(() => {
                fetchProjects();
            }, [fetchProjects]);
            const hasBudget = projects[0]?.budget !== undefined ? 'true' : 'false';
            return <span data-testid="budget">{hasBudget}</span>;
        };
        
        render(<DataProvider><BudgetCheck /></DataProvider>);
        await waitFor(() => {
            expect(screen.getByTestId('budget')).toHaveTextContent('false');
        });
        expect(api.fetchBudgetHeader).not.toHaveBeenCalled();
    });
});