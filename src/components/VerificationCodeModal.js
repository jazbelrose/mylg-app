import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Input, Button, Typography } from 'antd';
import { confirmSignUp, confirmSignIn, resendSignUpCode } from 'aws-amplify/auth';
const { Paragraph, Text } = Typography;
const flowLabels = {
    SMS_MFA: 'verification code',
    SOFTWARE_TOKEN_MFA: 'authenticator code',
    CONFIRM_SIGN_UP: 'confirmation code',
};
export default function VerificationCodeModal({ open, flow, // 'SMS_MFA' | 'SOFTWARE_TOKEN_MFA' | 'CONFIRM_SIGN_UP'
username, // email/username string
onSuccess, // callback after successful confirmation
onCancel, // callback when modal closed
clearPending, // clear any persisted pending challenge
onResendMfa, // OPTIONAL: () => Promise<void> to re-initiate sign-in and trigger a new MFA code
 }) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    // Focus and reset on open
    useEffect(() => {
        if (open) {
            setCode('');
            inputRef.current?.focus();
        }
    }, [open]);
    const handleSubmit = useCallback(async () => {
        const numericCode = (code || '').replace(/\D/g, '');
        if (!numericCode) {
            Modal.warning({ title: 'Enter code', content: 'Please enter the code to continue.' });
            return;
        }
        setLoading(true);
        try {
            if (flow === 'CONFIRM_SIGN_UP') {
                await confirmSignUp({ username, confirmationCode: numericCode });
            }
            else {
                // For MFA challenges Amplify uses the stored challenge/session under the hood
                await confirmSignIn({ challengeResponse: numericCode });
            }
            clearPending?.();
            onSuccess?.();
        }
        catch (e) {
            Modal.error({ title: 'Error', content: e?.message || 'Invalid code. Please try again.' });
        }
        finally {
            setLoading(false);
        }
    }, [code, flow, username, onSuccess, clearPending]);
    const handleResend = useCallback(async () => {
        try {
            if (flow === 'CONFIRM_SIGN_UP') {
                await resendSignUpCode({ username }); // <- use prop
                Modal.success({ title: 'Code resent', content: 'A new confirmation code was sent to your email.' });
            }
            else {
                // No generic "resend MFA" API in v6. Consumer should re-initiate sign-in to trigger a new code.
                if (onResendMfa) {
                    await onResendMfa();
                    Modal.success({ title: 'MFA code resent', content: 'Please check your device.' });
                }
                else {
                    Modal.info({
                        title: 'Resend code',
                        content: 'To resend an MFA code, please restart sign-in for this account so Cognito can send a new code.',
                    });
                }
            }
        }
        catch (e) {
            Modal.error({ title: 'Error', content: e?.message || 'Failed to resend code.' });
        }
    }, [flow, username, onResendMfa]);
    return (_jsxs(Modal, { open: open, title: "Enter code", onCancel: () => { clearPending?.(); onCancel?.(); }, onOk: handleSubmit, okText: "Verify", confirmLoading: loading, maskClosable: false, destroyOnClose: true, children: [_jsxs(Paragraph, { children: ["Enter the ", flowLabels[flow] || 'code', " for ", _jsx(Text, { strong: true, children: username }), "."] }), _jsx(Input, { ref: inputRef, value: code, onChange: (e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6)), onPressEnter: handleSubmit, onPaste: (e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('Text') || '';
                    setCode(pasted.replace(/\D/g, '').slice(0, 6));
                }, placeholder: "123456", maxLength: 6, inputMode: "numeric", autoComplete: "one-time-code" }), _jsx("div", { style: { marginTop: 8 }, children: _jsx(Button, { type: "link", onClick: handleResend, style: { paddingLeft: 0 }, children: "Didn\u2019t get a code?" }) })] }));
}
