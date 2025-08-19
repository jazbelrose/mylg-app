import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { confirmSignUp, resendSignUpCode, signIn, fetchAuthSession } from 'aws-amplify/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../../app/contexts/DataProvider';
import { updateUserProfile } from '../../../utils/api';
import { useAuth } from '../../../app/contexts/AuthContext';
import styles from '../auth.module.css';
export function EmailVerification({ registrationData, userEmail }) {
    const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', '']);
    const [verificationStatus, setVerificationStatus] = useState('');
    const [resendStatus, setResendStatus] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const isVerifyingRef = useRef(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { opacity } = useData();
    const { validateAndSetUserSession } = useAuth();
    const derivedEmail = registrationData?.email || userEmail || location.state?.email;
    const opacityClass = opacity === 1 ? 'opacity-high' : 'opacity-low';
    // Change handler for individual OTP input
    const handleOtpInputChange = (index, value) => {
        const sanitizedValue = value.replace(/\D/g, '').slice(0, 1);
        const newOtpInputs = [...otpInputs];
        newOtpInputs[index] = sanitizedValue;
        setOtpInputs(newOtpInputs);
        if (sanitizedValue && index < otpInputs.length - 1) {
            const nextInputID = `input-${index + 1}`;
            document.getElementById(nextInputID)?.focus();
        }
    };
    // Paste handler for the first OTP input
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData
            .getData('Text')
            .replace(/\D/g, '')
            .slice(0, otpInputs.length);
        if (!pasteData)
            return;
        const digits = pasteData.split('');
        const newOtpInputs = [...otpInputs];
        digits.forEach((digit, i) => {
            newOtpInputs[i] = digit;
        });
        setOtpInputs(newOtpInputs);
        if (digits.length < otpInputs.length) {
            const nextIndex = digits.length;
            document.getElementById(`input-${nextIndex}`)?.focus();
        }
    };
    // Verification handler
    const handleVerify = useCallback(async () => {
        if (!derivedEmail || isVerifyingRef.current)
            return;
        isVerifyingRef.current = true;
        setIsVerifying(true);
        setResendStatus('');
        const verificationCode = otpInputs.join('');
        if (verificationCode.length < otpInputs.length) {
            setVerificationStatus('Please enter the complete verification code.');
            isVerifyingRef.current = false;
            setIsVerifying(false);
            return;
        }
        try {
            const { isSignUpComplete, nextStep } = await confirmSignUp({
                username: derivedEmail,
                confirmationCode: verificationCode
            });
            if (isSignUpComplete) {
                setVerificationStatus('Email successfully verified');
                if (registrationData) {
                    await signIn({ username: derivedEmail, password: registrationData.password });
                    const session = await fetchAuthSession();
                    const sub = session.tokens?.idToken?.payload?.sub;
                    const { password, ...pendingData } = registrationData;
                    const profileData = { ...pendingData, userId: sub, cognitoSub: sub };
                    await updateUserProfile(profileData);
                    await validateAndSetUserSession();
                }
                navigate('/dashboard');
            }
            else {
                console.log('Next step:', nextStep);
            }
        }
        catch (error) {
            console.error('Error confirming sign up:', error);
            const alreadyVerified = error?.message?.toLowerCase().includes('already confirmed') ||
                error?.message?.toLowerCase().includes('already verified') ||
                error?.message?.toLowerCase().includes('current status is confirmed');
            if (alreadyVerified) {
                setVerificationStatus('Email successfully verified');
                if (registrationData) {
                    try {
                        await signIn({ username: derivedEmail, password: registrationData.password });
                        const session = await fetchAuthSession();
                        const sub = session.tokens?.idToken?.payload?.sub;
                        const { password, ...pendingData } = registrationData;
                        const profileData = { ...pendingData, userId: sub, cognitoSub: sub, pending: false };
                        await updateUserProfile(profileData);
                        await validateAndSetUserSession();
                    }
                    catch (signInError) {
                        console.error('Error during post-verification sign-in:', signInError);
                    }
                }
                navigate('/dashboard');
            }
            else {
                const message = error?.message ||
                    error?.name ||
                    'Verification failed. Please check the code and try again.';
                setVerificationStatus(message);
            }
        }
        finally {
            isVerifyingRef.current = false;
            setIsVerifying(false);
        }
    }, [
        derivedEmail,
        otpInputs,
        registrationData,
        validateAndSetUserSession,
        navigate
    ]);
    // Auto-verify when all inputs filled
    useEffect(() => {
        if (derivedEmail && otpInputs.every((d) => d !== '')) {
            handleVerify();
        }
    }, [otpInputs, derivedEmail, handleVerify]);
    // Resend code handler
    const handleResend = async () => {
        try {
            if (!derivedEmail) {
                setResendStatus('Email address not found.');
                return;
            }
            await resendSignUpCode({ username: derivedEmail });
            setResendStatus('A new code has been sent to your email.');
        }
        catch (error) {
            console.error('Error resending code:', error);
            setResendStatus('Failed to resend code. Please try again.');
        }
    };
    return (_jsxs(HelmetProvider, { children: [_jsx(Helmet, { children: _jsx("title", { children: "Email Verification | *MYLG!*" }) }), _jsx("div", { className: `${opacityClass} ${styles.authPage}`, children: _jsxs("div", { className: styles.authCard, children: [_jsx("div", { className: styles.wordmark, children: "*MYLG!*" }), !derivedEmail ? (_jsx("p", { className: styles.authSubtitle, children: "No email provided for verification." })) : (_jsxs(_Fragment, { children: [_jsx("h1", { className: styles.authTitle, children: "Verify your email" }), _jsxs("p", { className: styles.authSubtitle, children: ["Please enter the one-time password sent to", ' ', _jsx("b", { children: derivedEmail })] }), _jsxs("form", { className: styles.authForm, onSubmit: (e) => {
                                        e.preventDefault();
                                        handleVerify();
                                    }, children: [_jsx("div", { className: styles.field, style: { display: 'flex', justifyContent: 'center', gap: '8px' }, children: _jsx("div", { style: { display: 'flex', flexDirection: 'row', gap: '16px' }, children: otpInputs.map((value, index) => (_jsx("input", { className: styles.input, type: "text", maxLength: "1", id: `input-${index}`, value: value, onChange: (e) => handleOtpInputChange(index, e.target.value), onPaste: index === 0 ? handleOtpPaste : undefined, autoFocus: index === 0, inputMode: "numeric", pattern: "[0-9]*", style: { textAlign: 'center', width: '44px' } }, index))) }) }), _jsx("button", { type: "submit", className: `${styles.button} ${styles.primary}`, style: { marginTop: '24px' }, disabled: isVerifying, children: "Validate" }), _jsx("button", { type: "button", className: `${styles.button} ${styles.secondary}`, onClick: handleResend, children: "Resend Code" })] }), resendStatus && _jsx("p", { className: styles.helper, children: resendStatus }), verificationStatus && (_jsx("p", { className: verificationStatus === 'Email successfully verified'
                                        ? styles.success
                                        : styles.helper, children: verificationStatus }))] }))] }) })] }));
}
