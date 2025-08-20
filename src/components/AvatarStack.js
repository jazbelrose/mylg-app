import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import styles from './AvatarStack.module.css';
const getMaxVisible = () => {
    if (window.innerWidth < 768)
        return 3;
    return 4;
};
const AvatarStack = ({ members = [], onClick }) => {
    const [maxVisible, setMaxVisible] = useState(getMaxVisible());
    useEffect(() => {
        const handleResize = () => setMaxVisible(getMaxVisible());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const visibleMembers = members.slice(0, maxVisible);
    const remaining = members.length - visibleMembers.length;
    return (_jsxs("div", { className: styles.stack, "aria-label": "Project team members", onClick: onClick, role: onClick ? 'button' : undefined, tabIndex: onClick ? 0 : undefined, style: onClick ? { cursor: 'pointer' } : undefined, children: [visibleMembers.map((m, idx) => {
                const label = `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'User';
                const initials = ((m.firstName?.[0] || '') + (m.lastName?.[0] || '')).toUpperCase() || 'U';
                return (_jsx("div", { className: styles.avatar, style: { zIndex: visibleMembers.length - idx }, title: label, "aria-label": label, children: m.thumbnail ? (_jsx("img", { src: m.thumbnail, alt: label })) : (_jsx("span", { className: styles.initials, children: initials })) }, m.userId));
            }), remaining > 0 && (_jsx("div", { className: styles.avatar, style: { zIndex: 0 }, title: `${remaining} more`, "aria-label": `${remaining} more users`, children: _jsxs("span", { className: styles.more, children: ["+", remaining] }) }))] }));
};
export default AvatarStack;
