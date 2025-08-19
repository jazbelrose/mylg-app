import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Eye, EyeOff } from 'lucide-react';
import styles from '../auth.module.css';
const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/; // length >=8, number & special char
export function Forgotpassword() {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1); // 1: email, 2: code+new password, 3: success
    const [error, setError] = useState('');
    const handleResetPassword = async () => {
        setError('');
        try {
            await resetPassword({ username: email });
            setStep(2);
        }
        catch (err) {
            setError(err.message || 'Error sending reset code.');
        }
    };
    const handleConfirmReset = async () => {
        setError('');
        if (!passwordRegex.test(newPassword)) {
            setError('Password must be at least 8 characters and include a number and special character');
            return;
        }
        try {
            await confirmResetPassword({
                username: email,
                confirmationCode: code,
                newPassword,
            });
            setStep(3);
        }
        catch (err) {
            setError(err.message || 'Error resetting password.');
        }
    };
    return (_jsxs(HelmetProvider, { children: [_jsx(Helmet, { children: _jsx("title", { children: "Forgot Password | *MYLG!*" }) }), _jsx("div", { className: styles.authPage, children: _jsxs("div", { className: styles.authCard, children: [_jsx("div", { className: styles.wordmark, children: "*MYLG!*" }), step === 1 && (_jsxs(_Fragment, { children: [_jsx("h1", { className: styles.authTitle, children: "Forgot your password?" }), _jsx("p", { className: styles.authSubtitle, children: "Enter your email address below and we'll send you a link to reset it." }), _jsxs("form", { className: styles.authForm, onSubmit: (e) => {
                                        e.preventDefault();
                                        handleResetPassword();
                                    }, children: [_jsxs("div", { className: styles.field, children: [_jsx("label", { htmlFor: "email", className: styles.label, children: "Email" }), _jsx("input", { id: "email", "aria-label": "Email", type: "email", autoComplete: "email", className: styles.input, value: email, onChange: (e) => setEmail(e.target.value), required: true })] }), _jsx("button", { type: "submit", className: `${styles.button} ${styles.primary}`, disabled: !email.trim(), children: "Reset Password" })] })] })), step === 2 && (_jsxs(_Fragment, { children: [_jsx("h1", { className: styles.authTitle, children: "Check your email" }), _jsx("p", { className: styles.authSubtitle, children: "Enter the verification code and your new password." }), _jsxs("form", { className: styles.authForm, onSubmit: (e) => {
                                        e.preventDefault();
                                        handleConfirmReset();
                                    }, children: [_jsxs("div", { className: styles.field, children: [_jsx("label", { htmlFor: "code", className: styles.label, children: "Verification Code" }), _jsx("input", { id: "code", "aria-label": "Verification Code", className: styles.input, value: code, onChange: (e) => setCode(e.target.value), required: true })] }), _jsxs("div", { className: styles.field, children: [_jsx("label", { htmlFor: "newPassword", className: styles.label, children: "New Password" }), _jsxs("div", { className: styles.passwordWrapper, children: [_jsx("input", { id: "newPassword", "aria-label": "New Password", type: showPassword ? 'text' : 'password', autoComplete: "new-password", className: styles.input, value: newPassword, onChange: (e) => setNewPassword(e.target.value), required: true }), _jsx("button", { type: "button", className: styles.toggle, "aria-label": showPassword ? 'Hide password' : 'Show password', onClick: () => setShowPassword((v) => !v), children: showPassword ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) })] })] }), _jsx("button", { type: "submit", className: `${styles.button} ${styles.primary}`, disabled: !code.trim() || !newPassword.trim(), children: "Submit New Password" })] })] })), step === 3 && (_jsxs(_Fragment, { children: [_jsx("h1", { className: styles.authTitle, children: "Password reset" }), _jsx("p", { className: styles.authSubtitle, children: "Your password has been reset successfully." }), _jsx("div", { className: styles.actions, children: _jsx(Link, { to: "/login", className: `${styles.button} ${styles.secondary}`, children: "Login" }) })] })), error && _jsx("p", { className: styles.helper, children: error }), step !== 3 && (_jsxs("div", { className: styles.actions, children: [_jsx(Link, { to: "/register", className: styles.forgot, children: "Create an account" }), _jsx(Link, { to: "/login", className: styles.forgot, children: "Already have an account? Login" })] }))] }) })] }));
}
export default Forgotpassword;
