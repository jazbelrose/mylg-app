import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('./AuthContext', () => ({
    useAuth: jest.fn(),
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
const { DataProvider, useData } = require('./DataProvider');

const TestComponent: React.FC = () => {
    const { projectsError, fetchProjects } = useData();
    React.useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    return <span data-testid="err">{projectsError ? 'true' : 'false'}</span>;
};

describe('DataProvider', () => {
    beforeEach(() => {
        useAuth.mockReturnValue({ user: null });
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

    it('does not hydrate projects with budget data', async () => {
        useAuth.mockReturnValue({ user: { userId: 'u1', role: 'admin', projects: [] } });
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