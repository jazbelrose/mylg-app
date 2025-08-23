import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserProvider, useUserContext } from './UserContext';

jest.mock('./AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('../../utils/api', () => ({
    fetchAllUsers: jest.fn(() => Promise.resolve([])),
    fetchUserProfile: jest.fn(() => Promise.resolve({})),
    updateUserProfile: jest.fn(),
}));

const { useAuth } = require('./AuthContext');
const api = require('../../utils/api');

const TestComponent: React.FC = () => {
    const { allUsers, isLoading, fetchUserProfile } = useUserContext();
    React.useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);
    return (
        <div>
            <span data-testid="users-count">{allUsers.length}</span>
            <span data-testid="loading">{isLoading ? 'true' : 'false'}</span>
        </div>
    );
};

describe('UserContext', () => {
    beforeEach(() => {
        useAuth.mockReturnValue({ 
            user: { userId: 'u1', firstName: 'Test', lastName: 'User' },
            userId: 'u1',
            userName: 'Test User',
            isAdmin: false,
            isDesigner: false,
            isBuilder: false,
            isVendor: false,
            isClient: false,
        });
        api.fetchAllUsers.mockResolvedValue([
            { userId: 'u1', firstName: 'Test', lastName: 'User' },
            { userId: 'u2', firstName: 'Jane', lastName: 'Doe' }
        ]);
        api.fetchUserProfile.mockResolvedValue({
            userId: 'u1',
            firstName: 'Test',
            lastName: 'User',
            messages: []
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('loads users on mount', async () => {
        render(<UserProvider><TestComponent /></UserProvider>);
        await waitFor(() => {
            expect(screen.getByTestId('users-count')).toHaveTextContent('2');
        });
        expect(api.fetchAllUsers).toHaveBeenCalled();
    });

    it('provides auth derived values', () => {
        const TestAuthComponent: React.FC = () => {
            const { userName, userId, isAdmin } = useUserContext();
            return (
                <div>
                    <span data-testid="username">{userName}</span>
                    <span data-testid="userid">{userId}</span>
                    <span data-testid="admin">{isAdmin ? 'true' : 'false'}</span>
                </div>
            );
        };

        render(<UserProvider><TestAuthComponent /></UserProvider>);
        expect(screen.getByTestId('username')).toHaveTextContent('Test User');
        expect(screen.getByTestId('userid')).toHaveTextContent('u1');
        expect(screen.getByTestId('admin')).toHaveTextContent('false');
    });
});