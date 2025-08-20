import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import styles from '../auth.module.css';
import { confirmUserAttribute } from 'aws-amplify/auth';
import { useNavigate, useLocation } from 'react-router-dom';
export function EmailChangeVerification() {
    const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', '']);
    const [verificationStatus, setVerificationStatus] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { newUserEmail } = location.state || {};
    const handleOtpInputChange = (index, value) => {
        let newOtpInputs = [...otpInputs];
        newOtpInputs[index] = value.replace(/\D/g, '').slice(0, 1);
        setOtpInputs(newOtpInputs);
        if (value.match(/^\d$/) && index < otpInputs.length - 1) {
            document.getElementById(`input-${index + 1}`).focus();
        }
        if (newOtpInputs.every((d) => d !== '')) {
            handleConfirmAttribute();
        }
    };
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('Text').replace(/\D/g, '').slice(0, otpInputs.length);
        if (!pasteData)
            return;
        const digits = pasteData.split('');
        const newOtpInputs = [...otpInputs];
        for (let i = 0; i < digits.length; i++) {
            newOtpInputs[i] = digits[i];
        }
        setOtpInputs(newOtpInputs);
        if (digits.length === otpInputs.length) {
            handleConfirmAttribute();
        }
        else {
            const nextIndex = digits.length < otpInputs.length ? digits.length : otpInputs.length - 1;
            document.getElementById(`input-${nextIndex}`)?.focus();
        }
    };
    const handleConfirmAttribute = async () => {
        const confirmationCode = otpInputs.join('');
        console.log('Submitting confirmation code:', confirmationCode); // Log the code being submitted
        try {
            await confirmUserAttribute({
                userAttributeKey: 'email', // Assuming we're verifying the email
                confirmationCode,
            });
            console.log('Email successfully verified.');
            navigate('/dashboard'); // Navigate to the dashboard or a confirmation page on success
        }
        catch (error) {
            console.error('Error confirming user attribute:', error);
            setVerificationStatus('Verification failed. Please check the code and try again.');
        }
    };
    return (_jsx("div", { className: styles.authPage, children: _jsxs("div", { className: styles.authCard, children: [_jsx("div", { className: styles.wordmark, children: "*MYLG!*" }), _jsx("h1", { className: styles.authTitle, children: "Verify your email" }), _jsxs("p", { className: styles.authSubtitle, children: ["Please enter the one-time password sent to ", _jsx("b", { children: newUserEmail })] }), _jsxs("form", { className: styles.authForm, onSubmit: e => { e.preventDefault(); handleConfirmAttribute(); }, children: [_jsx("div", { className: styles.field, style: { display: 'flex', justifyContent: 'center', gap: '8px' }, children: otpInputs.map((value, index) => (_jsx("input", { className: styles.input, type: "text", maxLength: "1", id: `input-${index}`, value: value, onChange: (e) => handleOtpInputChange(index, e.target.value), onPaste: index === 0 ? handleOtpPaste : undefined, autoFocus: index === 0, inputMode: "numeric", pattern: "[0-9]*", style: { textAlign: 'center', width: '44px' } }, index))) }), _jsx("button", { type: "submit", className: `${styles.button} ${styles.primary}`, style: { marginTop: '24px', width: '100%' }, children: "Validate" })] }), verificationStatus && _jsx("p", { className: styles.helper, children: verificationStatus })] }) }));
}
;
