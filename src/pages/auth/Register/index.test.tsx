// Register.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Register } from './index';
import { signUp, resendSignUpCode } from '@aws-amplify/auth';

jest.mock('@aws-amplify/auth', () => ({
  signUp: jest.fn(),
  resendSignUpCode: jest.fn(),
}));

jest.mock('../Email-verification', () => ({
  __esModule: true,
  default: () => <div data-testid="email-verification">verification</div>,
}));

jest.mock('../../../app/contexts/DataProvider', () => ({
  useData: () => ({ opacity: 1 }),
}));

jest.mock('../../../utils/api', () => ({
  REGISTERED_USER_TEAM_NOTIFICATION_API_URL: 'https://example.com',
  updateUserProfilePending: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

const mockedSignUp = signUp as jest.MockedFunction<typeof signUp>;
const mockedResend = resendSignUpCode as jest.MockedFunction<typeof resendSignUpCode>;

describe('Register', () => {
  it('resends code when user already exists and shows verification', async () => {
    mockedSignUp.mockRejectedValue({ name: 'UsernameExistsException' } as any);

    const { getByLabelText, getByText, getByTestId } = render(<Register />);

    fireEvent.change(getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByLabelText('Phone Number'), { target: { value: '1234567890' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'Passw0rd!' } });
    fireEvent.change(getByLabelText('Repeat Password'), { target: { value: 'Passw0rd!' } });

    fireEvent.click(getByText('Register Account'));

    await waitFor(() => {
      expect(mockedResend).toHaveBeenCalledWith({ username: 'test@example.com' });
      expect(getByTestId('email-verification')).toBeInTheDocument();
    });
  });
});
