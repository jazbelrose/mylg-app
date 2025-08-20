import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../app/contexts/AuthContext';
import { UsersProvider } from '../app/contexts/UsersContext';
import { DataProvider } from '../app/contexts/DataProvider';
import { ProjectsProvider } from '../app/contexts/ProjectsContext';
import { MessagesProvider } from '../app/contexts/MessagesContext';
import { NotificationProvider } from '../app/contexts/NotificationContext';
import { DMConversationProvider } from '../app/contexts/DMConversationContext';
import { SocketProvider } from '../app/contexts/SocketContext';
import { OnlineStatusProvider } from '../app/contexts/OnlineStatusContext';
import { ScrollProvider } from '../app/contexts/ScrollContext';
import { NavigationDirectionProvider } from '../app/contexts/NavigationDirectionProvider';

// Safe default mocks for testing
const defaultUserMock = {
  userId: 'test-user-123',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  email: 'test@example.com'
};

const defaultProjectsMock = [
  {
    projectId: 'project-1',
    title: 'Test Project',
    team: [{ userId: 'test-user-123', role: 'admin' }],
    timelineEvents: [],
    thumbnails: []
  }
];

// Mock providers with safe defaults for testing
const MockedAuthProvider = ({ children, user = defaultUserMock }) => (
  <AuthProvider value={{
    user,
    getAuthTokens: jest.fn().mockResolvedValue({ accessToken: 'mock-token' }),
    validateAndSetUserSession: jest.fn()
  }}>
    {children}
  </AuthProvider>
);

const MockedUsersProvider = ({ children, allUsers = [defaultUserMock] }) => (
  <UsersProvider value={{
    allUsers,
    userData: defaultUserMock,
    isLoading: false,
    refreshUsers: jest.fn(),
    fetchUserProfile: jest.fn()
  }}>
    {children}
  </UsersProvider>
);

const MockedProjectsProvider = ({ children, projects = defaultProjectsMock }) => (
  <ProjectsProvider value={{
    projects,
    allProjects: projects,
    activeProject: projects[0] || null,
    projectsError: false,
    isLoading: false,
    fetchProjects: jest.fn(),
    fetchProjectDetails: jest.fn()
  }}>
    {children}
  </ProjectsProvider>
);

const MockedMessagesProvider = ({ children }) => (
  <MessagesProvider value={{
    projectMessages: {},
    dmThreads: [],
    dmReadStatus: {},
    deletedMessageIds: new Set(),
    markMessageDeleted: jest.fn(),
    clearDeletedMessageId: jest.fn(),
    toggleReaction: jest.fn()
  }}>
    {children}
  </MessagesProvider>
);

/**
 * Renders a component with all required providers for testing
 * @param {React.Component} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.user - Mock user data
 * @param {Array} options.projects - Mock projects data
 * @param {Array} options.allUsers - Mock users data
 * @param {String} options.initialRoute - Initial route for MemoryRouter
 * @param {Object} options.renderOptions - Additional options for @testing-library/render
 * @returns {Object} Render result with additional utilities
 */
export const renderWithProviders = (
  ui,
  {
    user = defaultUserMock,
    projects = defaultProjectsMock,
    allUsers = [defaultUserMock],
    initialRoute = '/',
    ...renderOptions
  } = {}
) => {
  const AllProviders = ({ children }) => (
    <MemoryRouter initialEntries={[initialRoute]}>
      <MockedAuthProvider user={user}>
        <MockedUsersProvider allUsers={allUsers}>
          <DataProvider>
            <MockedProjectsProvider projects={projects}>
              <MockedMessagesProvider>
                <NotificationProvider>
                  <DMConversationProvider>
                    <SocketProvider>
                      <OnlineStatusProvider>
                        <ScrollProvider>
                          <NavigationDirectionProvider>
                            {children}
                          </NavigationDirectionProvider>
                        </ScrollProvider>
                      </OnlineStatusProvider>
                    </SocketProvider>
                  </DMConversationProvider>
                </NotificationProvider>
              </MockedMessagesProvider>
            </MockedProjectsProvider>
          </DataProvider>
        </MockedUsersProvider>
      </MockedAuthProvider>
    </MemoryRouter>
  );

  const result = render(ui, { wrapper: AllProviders, ...renderOptions });

  return {
    ...result,
    // Utility to rerender with different props
    rerender: (newUi) => result.rerender(newUi)
  };
};

/**
 * Lightweight provider for testing components that only need specific contexts
 */
export const renderWithMinimalProviders = (
  ui,
  { contexts = ['auth', 'users', 'projects', 'messages'], ...options } = {}
) => {
  const includesContext = (name) => contexts.includes(name);
  
  let wrapper = ({ children }) => children;

  if (includesContext('auth')) {
    const AuthWrapper = wrapper;
    wrapper = ({ children }) => (
      <AuthWrapper>
        <MockedAuthProvider user={options.user}>
          {children}
        </MockedAuthProvider>
      </AuthWrapper>
    );
  }

  if (includesContext('users')) {
    const UsersWrapper = wrapper;
    wrapper = ({ children }) => (
      <UsersWrapper>
        <MockedUsersProvider allUsers={options.allUsers}>
          {children}
        </MockedUsersProvider>
      </UsersWrapper>
    );
  }

  if (includesContext('projects')) {
    const ProjectsWrapper = wrapper;
    wrapper = ({ children }) => (
      <ProjectsWrapper>
        <MockedProjectsProvider projects={options.projects}>
          {children}
        </MockedProjectsProvider>
      </ProjectsWrapper>
    );
  }

  if (includesContext('messages')) {
    const MessagesWrapper = wrapper;
    wrapper = ({ children }) => (
      <MessagesWrapper>
        <MockedMessagesProvider>
          {children}
        </MockedMessagesProvider>
      </MessagesWrapper>
    );
  }

  return render(ui, { wrapper, ...options.renderOptions });
};

export { defaultUserMock, defaultProjectsMock };