import React, { useState, useEffect, FormEvent } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import Cookies from 'js-cookie';
import { Alert, Button as AntButton } from 'antd';
import { useAuth } from '../../../app/contexts/AuthContext';
import { useData } from '../../../app/contexts/DataProvider';
import SpinnerOverlay from '../../../components/SpinnerOverlay';
import { Eye, EyeOff } from 'lucide-react';
import styles from '../auth.module.css';
import VerificationCodeModal from '../../../components/VerificationCodeModal';
import usePendingAuthChallenge from '../../../utils/usePendingAuthChallenge';
import normalizeCognitoError from '../../../utils/normalizeCognitoError';

interface ModalState {
    open: boolean;
    flow: string | null;
    username: string;
    onResendMfa: (() => Promise<void>) | null;
}

export function Login() {
    // Auth cleaner utility
    async function ensureCleanAuthState(targetUsername: string): Promise<string> {
        try {
            const current = await getCurrentUser();
            if (!targetUsername || current.username === targetUsername) {
                // already signed in as the same user → just finalize
                return 'same-user-signed-in';
            }
            // signed in as a different user → clear first
            await signOut();
            return 'signed-out';
        }
        catch {
            // not signed in
            return 'no-session';
        }
    }
    const { isAuthenticated, validateAndSetUserSession } = useAuth();
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalState>({ open: false, flow: null, username: '', onResendMfa: null });
    const navigate = useNavigate();
    const { opacity } = useData();
    const { pending, savePending, clearPending } = usePendingAuthChallenge();
    const opacityClass = opacity === 1 ? 'opacity-high' : 'opacity-low';
    const pendingForUser = pending && pending.username === username;
    
    const openVerificationModal = ({ flow, username: name, onResendMfa }: { 
        flow: string; 
        username: string; 
        onResendMfa: () => Promise<void>; 
    }) => {
        setModal({ open: true, flow, username: name, onResendMfa });
    };
    
    const closeVerificationModal = () => setModal((m) => ({ ...m, open: false }));
    const finalizeSession = async () => {
        Cookies.set('myCookie', 'newValue', {
            expires: 7,
            secure: true,
            sameSite: 'Strict',
        });
        await fetchAuthSession();
        await validateAndSetUserSession();
        navigate('/dashboard', { replace: true });
    };
    const resendMfa = async (user: string = pending?.username || '', pass: string = password) => {
        if (!user || !pass)
            return;
        setError('');
        setIsLoading(true);
        try {
            await ensureCleanAuthState(user); // clear ghost session if any
            const res = await signIn({ username: user, password: pass });
            const step = res.nextStep?.signInStep;
            if (step === 'SMS_MFA' || step === 'SOFTWARE_TOKEN_MFA') {
                savePending({ authFlow: step, username: user });
            }
        }
        catch (e) {
            setError(normalizeCognitoError(e));
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSignIn = async ({ email, password: pass }: { email: string; password: string }) => {
        setError('');
        setIsLoading(true);
        try {
            const state = await ensureCleanAuthState(email);
            if (state === 'same-user-signed-in') {
                await fetchAuthSession();
                await validateAndSetUserSession();
                navigate('/dashboard', { replace: true });
                return;
            }
            const res = await signIn({ username: email, password: pass });
            const step = res?.nextStep?.signInStep;
            if (res?.isSignedIn === false && step === 'CONFIRM_SIGN_UP') {
                navigate('/email-verification', { replace: true, state: { email } });
                return;
            }
            if (step === 'SMS_MFA' || step === 'SOFTWARE_TOKEN_MFA') {
                savePending({ authFlow: step, username: email });
                openVerificationModal({
                    flow: step,
                    username: email,
                    onResendMfa: async () => {
                        await resendMfa(email, pass);
                    },
                });
                return;
            }
            await finalizeSession();
        }
        catch (e) {
            if (e?.name === 'UserNotConfirmedException') {
                navigate('/email-verification', { replace: true, state: { email } });
                return;
            }
            setError(normalizeCognitoError(e));
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSubmit = async () => {
        if (isAuthenticated)
            return;
        await handleSignIn({ email: username, password });
    };
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);
    const isFormValid = username.trim() && password.trim();
    return (_jsxs(HelmetProvider, { children: [_jsxs(Helmet, { children: [_jsx("title", { children: "Login | *MYLG!*" }), _jsx("meta", { name: "description", content: "Log in to your *MYLG!* account to manage creative projects effortlessly." }), _jsx("meta", { name: "robots", content: "noindex, nofollow" })] }), _jsxs("div", { className: `${opacityClass} ${styles.authPage}`, children: [isLoading && _jsx(SpinnerOverlay, {}), _jsxs("div", { className: styles.authCard, children: [_jsx("div", { className: styles.wordmark, children: "*MYLG!*" }), _jsx("h1", { className: styles.authTitle, children: "Sign in" }), _jsx("p", { className: styles.authSubtitle, children: "Please enter your login and password" }), pending && (_jsx(Alert, { type: "warning", message: "We sent you a code", description: _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(AntButton, { type: "link", onClick: () => openVerificationModal({
                                                flow: pending.authFlow,
                                                username: pending.username,
                                                onResendMfa: async () => resendMfa(pending.username, password),
                                            }), children: "Enter code" }), _jsx(AntButton, { type: "link", onClick: () => resendMfa(pending.username, password), children: "Resend" })] }), showIcon: true, closable: true, onClose: clearPending, style: { marginBottom: 16 } })), _jsxs("form", { className: styles.authForm, onSubmit: (e) => {
                                    e.preventDefault();
                                    if (pendingForUser) {
                                        openVerificationModal({
                                            flow: pending.authFlow,
                                            username: pending.username,
                                            onResendMfa: async () => resendMfa(pending.username, password),
                                        });
                                    }
                                    else {
                                        handleSubmit();
                                    }
                                }, children: [_jsxs("div", { className: styles.field, children: [_jsx("label", { htmlFor: "email", className: styles.label, children: "Email" }), _jsx("input", { id: "email", "aria-label": "Email", type: "email", autoComplete: "email", className: styles.input, value: username, onChange: (e) => setUsername(e.target.value), required: true })] }), _jsxs("div", { className: styles.field, children: [_jsx("label", { htmlFor: "password", className: styles.label, children: "Password" }), _jsxs("div", { className: styles.passwordWrapper, children: [_jsx("input", { id: "password", "aria-label": "Password", type: showPassword ? 'text' : 'password', autoComplete: "current-password", className: `${styles.input} ${error ? styles.invalid : ''}`, value: password, onChange: (e) => setPassword(e.target.value), required: true }), _jsx("button", { type: "button", className: styles.toggle, "aria-label": showPassword ? 'Hide password' : 'Show password', onClick: () => setShowPassword((v) => !v), children: showPassword ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) })] }), error && _jsx("p", { className: styles.helper, children: error }), error?.toLowerCase().includes('already a signed in') && (_jsx("button", { type: "button", className: styles.linkBtn, onClick: async () => { await signOut(); clearPending(); setError(''); }, children: "Not you? Switch account" }))] }), pendingForUser ? (_jsx("button", { type: "button", className: `${styles.button} ${styles.primary}`, onClick: () => openVerificationModal({
                                            flow: pending.authFlow,
                                            username: pending.username,
                                            onResendMfa: async () => resendMfa(pending.username, password),
                                        }), children: "Enter code" })) : (_jsx("button", { type: "submit", className: `${styles.button} ${styles.primary}`, disabled: !isFormValid, children: "Login" }))] }), _jsxs("div", { className: styles.actions, children: [_jsx(Link, { to: "/forgot-password", state: { email: username }, className: styles.forgot, children: "Forgot password?" }), _jsx(Link, { to: "/register", state: { email: username }, className: `${styles.button} ${styles.secondary}`, children: "Create an account" })] })] }), _jsx(VerificationCodeModal, { open: modal.open, flow: modal.flow, username: modal.username, clearPending: clearPending, onResendMfa: modal.onResendMfa, onCancel: () => closeVerificationModal(), onSuccess: async () => {
                            closeVerificationModal();
                            if (modal.flow === 'CONFIRM_SIGN_UP') {
                                if (password) {
                                    setIsLoading(true);
                                    await handleSignIn({ email: username, password });
                                }
                            }
                            else {
                                await finalizeSession();
                            }
                        } })] })] }));
}
export default Login;
