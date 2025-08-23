import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import EmailVerification from './index';
import { confirmSignUp, fetchAuthSession, signIn } from 'aws-amplify/auth';
import { updateUserProfile } from '../../../utils/api';
jest.mock('aws-amplify/auth', () => ({
    confirmSignUp: jest.fn().mockResolvedValue({ isSignUpComplete: true }),
    resendSignUpCode: jest.fn(),
    signIn: jest.fn(),
    fetchAuthSession: jest.fn().mockResolvedValue({ tokens: { idToken: { payload: { sub: 'sub123' } } } }),
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
describe('EmailVerification', () => {
    beforeEach(() => {
        confirmSignUp.mockResolvedValue({ isSignUpComplete: true });
        fetchAuthSession.mockResolvedValue({ tokens: { idToken: { payload: { sub: 'sub123' } } } });
        signIn.mockResolvedValue({});
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('auto verifies when code is pasted', async () => {
        const { getAllByRole } = render(_jsx(EmailVerification, { userEmail: "test@example.com" }));
        const inputs = getAllByRole('textbox');
        fireEvent.paste(inputs[0], {
            clipboardData: {
                getData: () => '123456',
            },
        });
        await waitFor(() => {
            expect(confirmSignUp).toHaveBeenCalledWith({
                username: 'test@example.com',
                confirmationCode: '123456',
            });
        });
    });
    it('auto verifies when code typed', async () => {
        const { getAllByRole } = render(_jsx(EmailVerification, { userEmail: "test@example.com" }));
        const inputs = getAllByRole('textbox');
        const digits = ['1', '2', '3', '4', '5', '6'];
        digits.forEach((d, i) => {
            fireEvent.change(inputs[i], { target: { value: d } });
        });
        await waitFor(() => {
            expect(confirmSignUp).toHaveBeenCalled();
        });
    });
    it('prevents double verification when validate clicked after paste', async () => {
        const { getAllByRole, getByRole } = render(_jsx(EmailVerification, { userEmail: "test@example.com" }));
        const inputs = getAllByRole('textbox');
        const button = getByRole('button', { name: /validate/i });
        fireEvent.paste(inputs[0], {
            clipboardData: {
                getData: () => '123456',
            },
        });
        fireEvent.click(button);
        await waitFor(() => {
            expect(confirmSignUp).toHaveBeenCalledTimes(1);
        });
    });
    it('navigates to dashboard if user already verified', async () => {
        const error = new Error('User is already confirmed');
        error.name = 'NotAuthorizedException';
        confirmSignUp.mockImplementationOnce(() => {
            return Promise.reject(error);
        });
        const { getAllByRole, findByText } = render(_jsx(EmailVerification, { userEmail: "test@example.com" }));
        const inputs = getAllByRole('textbox');
        fireEvent.paste(inputs[0], {
            clipboardData: {
                getData: () => '123456'
            }
        });
        await findByText('Email successfully verified');
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });
});
it('keeps profile pending after verification', async () => {
    const registrationData = { password: 'pass123', pending: true };
    const { getAllByRole } = render(_jsx(EmailVerification, { userEmail: "test@example.com", registrationData: registrationData }));
    const inputs = getAllByRole('textbox');
    const digits = ['1', '2', '3', '4', '5', '6'];
    digits.forEach((d, i) => {
        fireEvent.change(inputs[i], { target: { value: d } });
    });
    await waitFor(() => {
        expect(updateUserProfile).toHaveBeenCalledWith(expect.objectContaining({ pending: true }));
    });
});
;
