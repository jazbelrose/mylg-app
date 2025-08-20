import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
jest.mock('./AuthContext', () => ({
    useAuth: jest.fn(),
}));
jest.mock('./ProjectsContext', () => ({
    useProjects: jest.fn(),
}));
jest.mock('../../utils/api', () => ({
    fetchAllUsers: jest.fn(() => Promise.resolve([])),
    fetchUserProfile: jest.fn(() => Promise.resolve({})),
    updateUserProfile: jest.fn(),
    GET_PROJECT_MESSAGES_URL: '',
    apiFetch: jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue([]),
    }),
}));
const { useAuth } = require('./AuthContext');
const { useProjects } = require('./ProjectsContext');
const api = require('../../utils/api');
const { DataProvider, useData } = require('./DataProvider');

const TestComponent = () => {
    const { projectsError, fetchProjects } = useProjects();
    React.useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    return _jsx("span", { "data-testid": "err", children: projectsError ? 'true' : 'false' });
};
describe('DataProvider', () => {
    beforeEach(() => {
        useAuth.mockReturnValue({ user: null });
        useProjects.mockReturnValue({ 
            projectsError: false, 
            fetchProjects: jest.fn() 
        });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('sets projectsError when project fetch fails', async () => {
        useProjects.mockReturnValue({ 
            projectsError: true, 
            fetchProjects: jest.fn() 
        });
        render(_jsx(DataProvider, { children: _jsx(TestComponent, {}) }));
        await waitFor(() => {
            expect(screen.getByTestId('err')).toHaveTextContent('true');
        });
    });
    it('does not hydrate projects with budget data', async () => {
        useAuth.mockReturnValue({ user: { userId: 'u1', role: 'admin', projects: [] } });
        useProjects.mockReturnValue({ 
            projects: [{ projectId: 'p1' }], 
            fetchProjects: jest.fn() 
        });
        
        const BudgetCheck = () => {
            const { projects, fetchProjects } = useProjects();
            React.useEffect(() => {
                fetchProjects();
            }, [fetchProjects]);
            const hasBudget = projects[0]?.budget !== undefined ? 'true' : 'false';
            return _jsx("span", { "data-testid": "budget", children: hasBudget });
        };
        render(_jsx(DataProvider, { children: _jsx(BudgetCheck, {}) }));
        await waitFor(() => {
            expect(screen.getByTestId('budget')).toHaveTextContent('false');
        });
    });
});
