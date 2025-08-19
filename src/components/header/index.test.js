import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Headermain from './index';
jest.mock('react-router-dom', () => ({
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/' }),
    Link: ({ children, ...rest }) => _jsx("a", { ...rest, children: children }),
}));
jest.mock('../../app/contexts/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: true, setIsAuthenticated: jest.fn(), setUser: jest.fn() }),
}));
jest.mock('../../app/contexts/ScrollContext', () => ({
    useScrollContext: () => ({ isHeaderVisible: true, updateHeaderVisibility: jest.fn() }),
}));
const mockUseData = jest.fn();
jest.mock('../../app/contexts/DataProvider', () => ({
    useData: () => mockUseData(),
}));
jest.mock('../../app/contexts/OnlineStatusContext', () => ({
    useOnlineStatus: () => ({ onlineUsers: ['123'] }),
}));
jest.mock('../../app/contexts/useInactivityLogout', () => jest.fn());
jest.mock('../../app/contexts/NotificationContext', () => ({
    useNotifications: () => ({ notifications: [] }),
}));
jest.mock('../NotificationsDrawer', () => () => _jsx("div", { "data-testid": "drawer" }));
jest.mock('../NavBadge', () => () => _jsx("div", { "data-testid": "navbadge" }));
jest.mock('gsap', () => ({
    set: jest.fn(),
    timeline: () => ({
        to: jest.fn().mockReturnThis(),
        eventCallback: jest.fn().mockReturnThis(),
        paused: true,
        play: jest.fn(),
        reverse: jest.fn(),
    }),
}));
jest.mock('scramble-text', () => jest.fn());
jest.mock('aws-amplify/auth', () => ({
    signOut: jest.fn(),
}));
describe('Headermain', () => {
    it('hides name and online indicator when user is pending approval', () => {
        mockUseData.mockReturnValue({ userData: { firstName: 'John', userId: '123', pending: true } });
        const { container } = render(_jsx(Headermain, {}));
        expect(screen.queryByText('John')).toBeNull();
        expect(container.querySelector('.online-indicator')).toBeNull();
    });
    it('shows name and online indicator when user is approved', () => {
        mockUseData.mockReturnValue({ userData: { firstName: 'John', userId: '123', pending: false } });
        const { container } = render(_jsx(Headermain, {}));
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(container.querySelector('.online-indicator')).not.toBeNull();
    });
});
