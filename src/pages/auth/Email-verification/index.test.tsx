// EmailVerification.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import EmailVerification from './index';
import {
  confirmSignUp,
  fetchAuthSession,
  signIn,
  resendSignUpCode,
} from 'aws-amplify/auth';
import { updateUserProfile } from '../../../utils/api';

jest.mock('aws-amplify/auth', () => ({
  confirmSignUp: jest.fn().mockResolvedValue({ isSignUpComplete: true }),
  resendSignUpCode: jest.fn(),
  signIn: jest.fn(),
  fetchAuthSession: jest.fn().mockResolvedValue({
    tokens: { idToken: { payload: { sub: 'sub123' } } },
  }),
}));

jest.mock('../../../app/contexts/DataProvider', () => ({
  useData: () => ({ opacity: 1 }),
}));

jest.mock('../../../app/contexts/AuthContext', () => ({
  useAuth: () => ({ validateAndSetUserSession: jest.fn() }),
}));

jest.mock('../../../utils/api', () => ({
  updateUserProfile: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: {} }),
}));

// Cast the mocked fns for TS
const mockedConfirmSignUp = confirmSignUp as jest.MockedFunction<typeof confirmSignUp>;
const mockedFetchAuthSession = fetchAuthSession as jest.MockedFunction<typeof fetchAuthSession>;
const mockedSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockedUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;

describe('EmailVerification', () => {
  beforeEach(() => {
    mockedConfirmSignUp.mockResolvedValue({ isSignUpComplete: true });
    mockedFetchAuthSession.mockResolvedValue({
      tokens: { idToken: { payload: { sub: 'sub123' } } },
    } as any);
    mockedSignIn.mockResolvedValue({} as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('auto verifies when code is pasted', async () => {
    const { getAllByRole } = render(<EmailVerification userEmail="test@example.com" />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '123456',
      },
    } as any);

    await waitFor(() => {
      expect(mockedConfirmSignUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
      });
    });
  });

  it('auto verifies when code typed', async () => {
    const { getAllByRole } = render(<EmailVerification userEmail="test@example.com" />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];
    const digits = ['1', '2', '3', '4', '5', '6'];

    digits.forEach((d, i) => {
      fireEvent.change(inputs[i], { target: { value: d } });
    });

    await waitFor(() => {
      expect(mockedConfirmSignUp).toHaveBeenCalled();
    });
  });

  it('prevents double verification when validate clicked after paste', async () => {
    const { getAllByRole, getByRole } = render(<EmailVerification userEmail="test@example.com" />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];
    const button = getByRole('button', { name: /validate/i });

    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '123456',
      },
    } as any);

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedConfirmSignUp).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to dashboard if user already verified', async () => {
    const error = new Error('User is already confirmed') as Error & { name: string };
    error.name = 'NotAuthorizedException';
    mockedConfirmSignUp.mockImplementationOnce(() => Promise.reject(error));

    const { getAllByRole, findByText } = render(<EmailVerification userEmail="test@example.com" />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '123456',
      },
    } as any);

    await findByText('Email successfully verified');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('keeps profile pending after verification', async () => {
    const registrationData = { password: 'pass123', pending: true };
    const { getAllByRole } = render(
      <EmailVerification userEmail="test@example.com" registrationData={registrationData} />
    );
    const inputs = getAllByRole('textbox') as HTMLInputElement[];
    const digits = ['1', '2', '3', '4', '5', '6'];

    digits.forEach((d, i) => {
      fireEvent.change(inputs[i], { target: { value: d } });
    });

    await waitFor(() => {
      expect(mockedUpdateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ pending: true })
      );
    });
  });
});
