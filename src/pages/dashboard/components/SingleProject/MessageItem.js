import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useMemo, useRef } from "react";
import User from "../../../../assets/svg/user.svg?react";
import { useOnlineStatus } from "../../../../app/contexts/OnlineStatusContext";
import { Trash2, Pencil, Smile } from "lucide-react";
import ReactPlayer from "react-player";
import '../../../../index.css';
import { S3_PUBLIC_BASE } from '../../../../utils/api';
import ReactionBar from '../../../../components/ReactionBar';
const MessageItem = ({ msg, prevMsg, userData, allUsers, openPreviewModal, folderKey, renderFilePreview, getFileNameFromUrl, onDelete, onEditRequest, onReact, }) => {
    const { onlineUsers } = useOnlineStatus();
    const isCurrentUser = msg.senderId === userData?.userId;
    const sender = (allUsers || []).find((u) => u.userId === msg.senderId) || {};
    const senderName = isCurrentUser
        ? userData?.firstName || "You"
        : sender.firstName || "Unknown";
    const senderThumbnail = isCurrentUser ? userData?.thumbnail : sender.thumbnail;
    const isSenderOnline = onlineUsers.includes(msg.senderId);
    const [showReactions, setShowReactions] = useState(false);
    const bubbleRef = useRef(null);
    const userReactions = useMemo(() => {
        const arr = [];
        Object.entries(msg.reactions || {}).forEach(([emoji, users]) => {
            if (users.includes(userData?.userId))
                arr.push(emoji);
        });
        return arr;
    }, [msg.reactions, userData?.userId]);
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const RenderLinkContent = ({ url }) => {
        if (/youtu\.be|youtube\.com|vimeo\.com/.test(url)) {
            return (_jsx("div", { style: { maxWidth: "300px" }, children: _jsx(ReactPlayer, { url: url, width: "100%", height: "200px", controls: true }) }));
        }
        let domain = "";
        try {
            domain = new URL(url).hostname;
        }
        catch (e) {
            domain = "";
        }
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;
        return (_jsx("div", { style: { maxWidth: "300px" }, children: _jsxs("a", { href: url, target: "_blank", rel: "noopener noreferrer", style: { color: "#4ea1f3", display: "flex", alignItems: "center" }, children: [_jsx("img", { src: faviconUrl, alt: "", style: { width: "16px", height: "16px", marginRight: "4px" } }), url] }) }));
    };
    const messageDate = new Date(msg.timestamp);
    const formattedDate = messageDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const formattedTime = messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    const hasReactions = useMemo(() => Object.values(msg.reactions || {}).some((users) => Array.isArray(users) && users.length > 0), [msg.reactions]);
    const handleEmojiClick = (emoji) => {
        if (onReact) {
            onReact(msg.messageId || msg.optimisticId, emoji);
        }
        setShowReactions(false);
    };
    let showDateBubble = !prevMsg;
    if (prevMsg) {
        const prevDate = new Date(prevMsg.timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
        if (formattedDate !== prevDate)
            showDateBubble = true;
    }
    return (_jsxs(React.Fragment, { children: [showDateBubble && _jsx("div", { className: "date-bubble", children: formattedDate }), _jsxs("div", { className: `message-row ${isCurrentUser ? "current-user" : ""}`, children: [!isCurrentUser && (_jsxs("div", { className: "avatar-wrapper", children: [senderThumbnail ? (_jsx("img", { src: senderThumbnail, alt: senderName, className: "avatar" })) : (_jsx(User, { className: "avatar" })), isSenderOnline && _jsx("span", { className: "online-indicator" })] })), _jsx("div", { className: "bubble-container", style: { position: 'relative' }, children: _jsxs("div", { className: "message-bubble", style: { background: isCurrentUser ? "#FA3356" : "#333" }, ref: bubbleRef, tabIndex: 0, children: [_jsx(ReactionBar, { visible: showReactions, anchorRef: bubbleRef, selected: userReactions, onSelect: handleEmojiClick, onClose: () => setShowReactions(false) }), _jsx("div", { className: "message-time", children: formattedTime }), _jsx("div", { className: "message-sender", children: senderName }), _jsx("div", { style: { marginBottom: "5px" }, children: msg.file ? (_jsx("div", { onClick: () => openPreviewModal(msg.file), style: { cursor: "pointer" }, children: renderFilePreview(msg.file, folderKey) })) : msg.text && msg.text.includes(S3_PUBLIC_BASE) ? (_jsx("div", { onClick: () => openPreviewModal({
                                            fileName: getFileNameFromUrl(msg.text),
                                            url: msg.text,
                                        }), style: { cursor: "pointer" }, children: renderFilePreview({ fileName: getFileNameFromUrl(msg.text), url: msg.text }, folderKey) })) : urlRegex.test(msg.text) ? (_jsx(RenderLinkContent, { url: msg.text.match(urlRegex)[0] })) : (msg.text) }), hasReactions && (_jsx("div", { className: "reaction-summary", children: Object.entries(msg.reactions || {}).map(([emoji, users]) => users.length > 0 ? (_jsxs("span", { onClick: () => handleEmojiClick(emoji), className: userReactions.includes(emoji) ? 'selected' : '', children: [emoji, " ", users.length] }, emoji)) : null) })), _jsxs("div", { className: "action-bar", children: [isCurrentUser && (_jsxs(_Fragment, { children: [_jsx("button", { className: "action-btn", onClick: () => onEditRequest && onEditRequest(msg), "aria-label": "Edit message", children: _jsx(Pencil, { size: 12 }) }), _jsx("button", { className: "action-btn", onClick: () => onDelete && onDelete(msg), "aria-label": "Delete message", children: _jsx(Trash2, { size: 12 }) })] })), _jsx("button", { className: "action-btn", onClick: () => setShowReactions((p) => !p), "aria-label": "Add reaction", children: _jsx(Smile, { size: 12 }) })] })] }) }), isCurrentUser && (_jsxs("div", { className: "avatar-wrapper", children: [senderThumbnail ? (_jsx("img", { src: senderThumbnail, alt: "You", className: "avatar avatar-right" })) : (_jsx(User, { className: "avatar avatar-right" })), isSenderOnline && _jsx("span", { className: "online-indicator" })] }))] })] }));
};
export default MessageItem;
