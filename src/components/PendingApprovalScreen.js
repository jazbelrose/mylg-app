import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const PendingApprovalScreen = () => (_jsx("div", { style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        overflow: 'hidden',
        padding: '20px',
        textAlign: 'center',
    }, children: _jsxs("div", { className: "pending-approval-message", style: {
            padding: '20px',
            maxWidth: '500px',
            borderRadius: '10px',
            backgroundColor: '#0c0c0c',
            color: '#fff',
            border: '2px solid white',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)',
        }, children: [_jsx("h2", { style: { marginBottom: '10px', whiteSpace: 'nowrap' }, children: "Account Pending Approval" }), _jsxs("p", { style: {
                    fontSize: '16px',
                    lineHeight: '1.5',
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                }, children: ["Your account is currently pending approval.", _jsx("br", {}), "You will be notified by email when your account has been activated.", _jsx("br", {}), "Please contact support if you have any questions @ ", _jsx("br", {}), ' ', _jsx("a", { href: "mailto:info@mylg.studio", style: {
                            color: '#FA3356',
                            textDecoration: 'underline',
                            whiteSpace: 'nowrap',
                        }, children: "info@mylg.studio" }), "."] })] }) }));
export default PendingApprovalScreen;
