import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../../app/contexts/DataProvider";
import { useMessages } from "../../../app/contexts/MessagesContext";
import { useAuth } from "../../../app/contexts/AuthContext";
import { useSocket } from "../../../app/contexts/SocketContext";
import { useOnlineStatus } from "../../../app/contexts/OnlineStatusContext";
import { useDMConversation } from "../../../app/contexts/DMConversationContext";
import { isMessageUnread, dedupeById, mergeAndDedupeMessages, } from "../../../utils/messageUtils";
import User from "../../../assets/svg/user.svg?react";
import { normalizeMessage } from "../../../utils/websocketUtils";
import { getWithTTL, setWithTTL } from "../../../utils/storageWithTTL";
import SpinnerOverlay from "../../../components/SpinnerOverlay";
import OptimisticImage from "../../../components/OptimisticImage";
import { Trash2 } from "lucide-react";
import MessageItem from "./SingleProject/MessageItem";
import { uploadData } from "aws-amplify/storage";
import { FaFilePdf, FaFileExcel, FaFileAlt, FaDraftingCompass, FaCube, } from "react-icons/fa";
import { SiAdobe, SiAffinitydesigner, SiAffinitypublisher, SiSvg, } from "react-icons/si";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faDownload } from "@fortawesome/free-solid-svg-icons";
import Modal from "../../../components/ModalWithStack";
import ConfirmModal from "../../../components/ConfirmModal";
import PromptModal from "../../../components/PromptModal";
import { slugify, findUserBySlug } from "../../../utils/slug";
import { GET_DM_MESSAGES_URL, THREADS_URL, DELETE_DM_MESSAGE_URL, DELETE_FILE_FROM_S3_URL, READ_STATUS_URL, EDIT_MESSAGE_URL, S3_PUBLIC_BASE, apiFetch, } from "../../../utils/api";
import "./SingleProject/ProjectMessagesThread.css";
if (typeof document !== 'undefined') {
    Modal.setAppElement("#root");
}
const msgKey = (convId) => `messages_${convId}`;
const getThumbnailUrl = (url, folderKey = "chat_uploads") => {
    return url.replace(`/${folderKey}/`, `/${folderKey}_thumbnails/`);
};
const getFileNameFromUrl = (url) => url.split("/").pop();
const renderFilePreview = (file, folderKey = "chat_uploads") => {
    const extension = file.fileName.split(".").pop().toLowerCase();
    const commonStyle = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    };
    if (["jpg", "jpeg", "png"].includes(extension)) {
        const thumbnailUrl = getThumbnailUrl(file.url, folderKey);
        const finalUrl = file.finalUrl || file.url;
        return (_jsx(OptimisticImage, { tempUrl: thumbnailUrl, finalUrl: finalUrl, alt: file.fileName }));
    }
    else if (extension === "pdf") {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(FaFilePdf, { size: 50, color: "red" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (extension === "svg") {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(SiSvg, { size: 50, color: "purple" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (extension === "txt") {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(FaFileAlt, { size: 50, color: "gray" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (["xls", "xlsx", "csv"].includes(extension)) {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(FaFileExcel, { size: 50, color: "green" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (["dwg", "vwx"].includes(extension)) {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(FaDraftingCompass, { size: 50, color: "brown" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (["c4d", "obj"].includes(extension)) {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(FaCube, { size: 50, color: "purple" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (extension === "ai") {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(SiAdobe, { size: 50, color: "orange" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (extension === "afdesign") {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(SiAffinitydesigner, { size: 50, color: "orange" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (extension === "afpub") {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(SiAffinitypublisher, { size: 50, color: "green" }), _jsx("span", { children: file.fileName })] }));
    }
    else if (extension === "js") {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(FaFileAlt, { size: 50, color: "blue", style: { fill: "blue" } }), _jsx("span", { children: file.fileName })] }));
    }
    else if (extension === "eps") {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(FaDraftingCompass, { size: 50, color: "brown" }), _jsx("span", { children: file.fileName })] }));
    }
    else {
        return (_jsxs("div", { style: commonStyle, children: [_jsx(FaFileAlt, { size: 50, color: "blue", style: { fill: "blue" } }), _jsx("span", { children: file.fileName })] }));
    }
};
const Messages = ({ initialUserSlug = null }) => {
    const navigate = useNavigate();
    const { getAuthTokens, isAuthenticated } = useAuth();
    const { userData, allUsers, isAdmin, setUserData } = useData();
    const { dmReadStatus, setDmReadStatus, setDmThreads, deletedMessageIds, markMessageDeleted, toggleReaction, dmThreads } = useMessages();
    const isCurrentUserAdmin = isAdmin;
    const { onlineUsers } = useOnlineStatus();
    const { setActiveDmConversationId } = useDMConversation();
    const [isMobile, setIsMobile] = useState(false);
    const [showConversation, setShowConversation] = useState(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        if (typeof window !== 'undefined') {
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);
    // dmThreads now carries `read : boolean`
    const threadMap = useMemo(() => {
        return dmThreads.reduce((acc, t) => {
            acc[t.conversationId] = t.read === false; // true | false when unread
            return acc;
        }, {});
    }, [dmThreads]);
    // Local state for conversation, messages, etc.
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);
    const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const folderKey = "chat_uploads";
    const { ws } = useSocket();
    const messages = useMemo(() => {
        if (!selectedConversation)
            return [];
        const all = Array.isArray(userData?.messages) ? userData.messages : [];
        const convMsgs = all.filter((m) => m.conversationId === selectedConversation);
        const filtered = convMsgs.filter((m) => !(deletedMessageIds.has(m.messageId) ||
            deletedMessageIds.has(m.optimisticId)));
        return dedupeById(filtered.map((m) => ({ ...m, read: true }))).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, [userData, selectedConversation, deletedMessageIds.size]);
    const persistReadStatus = async (conversationId) => {
        if (!conversationId)
            return;
        try {
            await apiFetch(READ_STATUS_URL, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: userData.userId,
                    conversationId,
                    read: true,
                }),
            });
            // WS broadcast to sync all inboxes
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "markRead",
                    conversationType: "dm",
                    conversationId,
                    userId: userData.userId,
                    read: true
                }));
            }
        }
        catch (err) {
            console.error("Failed to mark conversation read", err);
        }
    };
    const openConversation = async (conversationId) => {
        if (!conversationId)
            return;
        const [a, b] = conversationId.replace("dm#", "").split("___");
        const otherId = a === userData.userId ? b : a;
        const otherUser = allUsers.find(u => u.userId === otherId);
        const slug = otherUser ? slugify(`${otherUser.firstName}-${otherUser.lastName}`) : otherId;
        navigate(`/dashboard/messages/${slug}`);
        setSelectedConversation(conversationId);
        if (isMobile)
            setShowConversation(true);
        // Opening a thread marks it as read across all views immediately.
        setDmThreads((prev) => prev.map((t) => t.conversationId === conversationId ? { ...t, read: true } : t));
        markConversationAsRead(conversationId);
    };
    const handleMarkRead = (conversationId) => {
        if (!conversationId)
            return;
        setDmThreads((prev) => prev.map((t) => t.conversationId === conversationId ? { ...t, read: true } : t));
        markConversationAsRead(conversationId);
    };
    const markConversationAsRead = (conversationId) => {
        if (!conversationId)
            return;
        setUserData((prev) => {
            if (!prev || !Array.isArray(prev.messages))
                return prev;
            const updated = prev.messages.map((m) => m.conversationId === conversationId ? { ...m, read: true } : m);
            return { ...prev, messages: updated };
        });
        setDmReadStatus((prev) => ({
            ...prev,
            [conversationId]: new Date().toISOString(),
        }));
        persistReadStatus(conversationId);
    };
    const openPreviewModal = (file) => {
        setSelectedPreviewFile(file);
        setPreviewModalOpen(true);
    };
    const closePreviewModal = () => {
        setPreviewModalOpen(false);
        setSelectedPreviewFile(null);
    };
    const filteredDMUsers = allUsers.filter(user => {
        // Exclude current user
        if (user.userId === userData.userId)
            return false;
        // If current user is admin, return all users
        if (isCurrentUserAdmin)
            return true;
        // Otherwise, only include if the user is in the collaborators array or is an admin
        return ((userData.collaborators && userData.collaborators.includes(user.userId)) ||
            ((user.role || '').toLowerCase() === 'admin'));
    });
    // Keep a ref for the currently selected conversation.
    const selectedConversationRef = useRef(selectedConversation);
    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
    }, [selectedConversation]);
    useEffect(() => {
        setActiveDmConversationId(selectedConversation);
        return () => setActiveDmConversationId(null);
    }, [selectedConversation, setActiveDmConversationId]);
    useEffect(() => {
        if (initialUserSlug && userData) {
            const user = findUserBySlug(allUsers, initialUserSlug);
            if (user) {
                const sortedIds = [userData.userId, user.userId].sort();
                const conversationId = `dm#${sortedIds.join("___")}`;
                setSelectedConversation(conversationId);
                if (isMobile)
                    setShowConversation(true);
            }
        }
    }, [initialUserSlug, userData, allUsers, isMobile]);
    useEffect(() => {
        if (!ws || !selectedConversation)
            return;
        const payload = JSON.stringify({
            action: "setActiveConversation",
            conversationId: selectedConversation,
        });
        const sendWhenReady = () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
            else {
                const onOpen = () => {
                    ws.send(payload);
                    ws.removeEventListener("open", onOpen);
                };
                ws.addEventListener("open", onOpen);
            }
        };
        sendWhenReady();
    }, [ws, selectedConversation]);
    // WebSocket provided by context
    // Messages are derived from context state
    /**
       * 2️⃣ Fetch messages when the conversation changes.
       */
    useEffect(() => {
        if (!selectedConversation || !isAuthenticated) {
            if (!selectedConversation) {
                setIsLoading(false);
            }
            return;
        }
        const cached = getWithTTL(msgKey(selectedConversation));
        if (cached) {
            setUserData(prev => {
                if (!prev)
                    return prev;
                const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
                const others = prevMsgs.filter(m => m.conversationId !== selectedConversation);
                return { ...prev, messages: dedupeById([...others, ...cached]) };
            });
        }
        const fetchMessages = async () => {
            setIsLoading(true);
            setErrorMessage("");
            try {
                console.log("📡 Fetching messages for DM:", selectedConversation);
                const response = await apiFetch(`${GET_DM_MESSAGES_URL}?conversationId=${encodeURIComponent(selectedConversation)}`);
                const data = await response.json();
                if (data.error) {
                    console.error("❌ Error from API:", data.error);
                    // nothing
                }
                else if (Array.isArray(data)) {
                    console.log("✅ Messages received:", data);
                    const readData = data
                        .filter((m) => !(deletedMessageIds.has(m.messageId) ||
                        deletedMessageIds.has(m.optimisticId)))
                        .map((m) => ({ ...m, read: true }));
                    const uniqueData = dedupeById(readData);
                    setWithTTL(msgKey(selectedConversation), uniqueData);
                    setUserData((prev) => {
                        if (!prev)
                            return prev;
                        const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
                        const others = prevMsgs.filter(m => m.conversationId !== selectedConversation);
                        const merged = mergeAndDedupeMessages(others, uniqueData);
                        return { ...prev, messages: merged };
                    });
                    markConversationAsRead(selectedConversation);
                }
                else {
                    // nothing
                }
            }
            catch (error) {
                console.error("❌ Error fetching messages:", error);
                setErrorMessage("Failed to load messages.");
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchMessages();
    }, [selectedConversation, isAuthenticated]);
    /**
     * 3️⃣ Scroll to bottom when messages change.
     */
    const messagesEndRef = useRef(null);
    const initialScrollRef = useRef(true);
    useEffect(() => {
        if (initialScrollRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            initialScrollRef.current = false;
        }
        else {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);
    useEffect(() => {
        initialScrollRef.current = true;
    }, [selectedConversation]);
    useEffect(() => {
        if (selectedConversation) {
            setWithTTL(msgKey(selectedConversation), messages);
        }
    }, [messages, selectedConversation]);
    // Keep the input visible when the window size changes
    useEffect(() => {
        const handleResize = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    /**
     * 5️⃣ Send a new message via the shared WebSocket with optimistic update.
     */
    const sendMessage = () => {
        if (!selectedConversation) {
            console.warn("No conversation selected.");
            return;
        }
        if (!newMessage.trim()) {
            console.warn("🚨 sendMessage aborted: Message is empty.");
            return;
        }
        // Prepare the message data.
        const timestamp = new Date().toISOString();
        const optimisticId = Date.now() + '-' + Math.random().toString(36).slice(2);
        const messageData = {
            action: "sendMessage",
            conversationType: "dm",
            conversationId: selectedConversation,
            senderId: userData?.userId,
            text: newMessage,
            timestamp,
            optimisticId,
        };
        // Create an optimistic version of the message.
        const optimisticMessage = { ...messageData, optimistic: true };
        // Optimistically update the UI via context.
        setUserData(prev => {
            if (!prev)
                return prev;
            const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
            return { ...prev, messages: mergeAndDedupeMessages(prevMsgs, [optimisticMessage]) };
        });
        const maxAttempts = 5;
        const trySendMessage = (attempts = 0) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                console.warn("WebSocket not open. Attempting to reconnect. Attempt:", attempts);
                if (ws && ws.readyState !== WebSocket.OPEN) {
                    ws.close();
                }
                if (attempts < maxAttempts) {
                    setTimeout(() => {
                        trySendMessage(attempts + 1);
                    }, 1000);
                }
                else {
                    console.error("Failed to send message: WebSocket did not open after", maxAttempts, "attempts.");
                }
                return;
            }
            try {
                ws.send(JSON.stringify(normalizeMessage(messageData, "sendMessage")));
                console.log("✅ Message successfully sent!");
                const [a, b] = selectedConversation.replace("dm#", "").split("___");
                const recipientId = a === userData.userId ? b : a;
                if (THREADS_URL) {
                    apiFetch(THREADS_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            conversationId: selectedConversation,
                            senderId: userData.userId,
                            recipientId,
                            snippet: newMessage,
                            timestamp: timestamp,
                        }),
                    }).catch((err) => console.error("Thread update failed:", err));
                }
                // Optimistically update the thread so the sender doesn't see a NEW badge
                setDmThreads(prev => {
                    const idx = prev.findIndex(t => t.conversationId === selectedConversation);
                    if (idx !== -1) {
                        const updated = [...prev];
                        updated[idx] = {
                            ...updated[idx],
                            snippet: newMessage,
                            lastMsgTs: timestamp,
                            read: true,
                        };
                        return updated;
                    }
                    return [
                        ...prev,
                        {
                            conversationId: selectedConversation,
                            snippet: newMessage,
                            lastMsgTs: timestamp,
                            read: true,
                            otherUserId: recipientId,
                        },
                    ];
                });
                setNewMessage("");
            }
            catch (error) {
                console.error("❌ Error sending WebSocket message:", error);
            }
        };
        console.log("📤 Sending message:", messageData);
        trySendMessage();
    };
    const handleDrop = async (event) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        if (!files.length)
            return;
        for (const file of files) {
            const tempUrl = URL.createObjectURL(file);
            const optimisticId = Date.now() + "-" + file.name;
            const timestamp = new Date().toISOString();
            const optimisticMessage = {
                action: "sendMessage",
                conversationType: "dm",
                conversationId: selectedConversation,
                senderId: userData?.userId,
                text: tempUrl,
                file: { fileName: file.name, url: tempUrl, finalUrl: null },
                timestamp,
                optimisticId,
                optimistic: true,
            };
            setUserData(prev => {
                if (!prev)
                    return prev;
                const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
                return { ...prev, messages: mergeAndDedupeMessages(prevMsgs, [optimisticMessage]) };
            });
            try {
                const uploadedFile = await handleFileUpload(selectedConversation, file);
                if (!uploadedFile)
                    throw new Error("File upload failed");
                setUserData(prev => {
                    if (!prev)
                        return prev;
                    const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
                    const updated = prevMsgs.map(msg => msg.optimisticId === optimisticId
                        ? {
                            ...msg,
                            text: uploadedFile.url,
                            file: {
                                ...msg.file,
                                url: uploadedFile.url,
                                finalUrl: uploadedFile.url,
                            },
                            optimistic: false,
                        }
                        : msg);
                    return { ...prev, messages: updated };
                });
                const payload = {
                    action: "sendMessage",
                    conversationType: "dm",
                    conversationId: selectedConversation,
                    senderId: userData?.userId,
                    text: uploadedFile.url,
                    file: { fileName: file.name, url: uploadedFile.url },
                    timestamp,
                    optimisticId,
                };
                ws?.readyState === WebSocket.OPEN &&
                    ws.send(JSON.stringify(normalizeMessage(payload, "sendMessage")));
                const [a, b] = selectedConversation.replace("dm#", "").split("___");
                const recipientId = a === userData.userId ? b : a;
                if (THREADS_URL) {
                    apiFetch(THREADS_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            conversationId: selectedConversation,
                            senderId: userData.userId,
                            recipientId,
                            snippet: uploadedFile.url,
                            timestamp,
                        }),
                    }).catch((err) => console.error("Thread update failed:", err));
                }
                // Optimistically update the thread for attachments as well
                setDmThreads(prev => {
                    const idx = prev.findIndex(t => t.conversationId === selectedConversation);
                    if (idx !== -1) {
                        const updated = [...prev];
                        updated[idx] = {
                            ...updated[idx],
                            snippet: uploadedFile.url,
                            lastMsgTs: timestamp,
                            read: true,
                        };
                        return updated;
                    }
                    return [
                        ...prev,
                        {
                            conversationId: selectedConversation,
                            snippet: uploadedFile.url,
                            lastMsgTs: timestamp,
                            read: true,
                            otherUserId: recipientId,
                        },
                    ];
                });
            }
            catch (err) {
                console.error("File upload failed", err);
                setUserData(prev => {
                    if (!prev)
                        return prev;
                    const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
                    return { ...prev, messages: prevMsgs.filter(m => m.optimisticId !== optimisticId) };
                });
            }
            finally {
                URL.revokeObjectURL(tempUrl);
            }
        }
    };
    const handleFileUpload = async (conversationId, file) => {
        const filename = `dms/${conversationId}/${folderKey}/${file.name}`;
        try {
            await uploadData({
                key: filename,
                data: file,
                options: { accessLevel: "public" },
            });
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const encodedConversationId = encodeURIComponent(conversationId);
            const encodedFileName = encodeURIComponent(file.name);
            const fileUrl = `${S3_PUBLIC_BASE}/dms/${encodedConversationId}/${folderKey}/${encodedFileName}`;
            return { fileName: file.name, url: fileUrl };
        }
        catch (error) {
            console.error("Error uploading file:", error);
        }
    };
    const deleteMessage = async (message) => {
        const id = message.messageId || message.optimisticId;
        if (!id)
            return;
        try {
            if (message.file?.url) {
                const fileUrl = message.file.url;
                await apiFetch(DELETE_FILE_FROM_S3_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId: selectedConversation,
                        field: folderKey,
                        fileKeys: [fileUrl],
                    }),
                });
            }
            if (message.messageId) {
                const url = `${DELETE_DM_MESSAGE_URL}?` +
                    `conversationId=${encodeURIComponent(selectedConversation)}` +
                    `&messageId=${encodeURIComponent(message.messageId)}`;
                const res = await apiFetch(url, { method: "DELETE" });
                if (!res.ok) {
                    const err = await res.json();
                    console.error("Delete failed:", err);
                    return;
                }
            }
            const prevMsgs = Array.isArray(userData?.messages) ? userData.messages : [];
            const updatedMsgs = prevMsgs.filter(m => (m.messageId || m.optimisticId) !== id);
            setUserData(prev => (prev ? { ...prev, messages: updatedMsgs } : prev));
            // Track this deletion locally so re-fetches don't resurrect the message.
            markMessageDeleted(id);
            // ❶ After local state update, re-compute the snippet for this
            // conversation so the inbox preview updates instantly.
            const convoMsgs = updatedMsgs
                .filter(m => m.conversationId === selectedConversation)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const lastMsg = convoMsgs[0];
            const newSnippet = lastMsg?.text || "";
            const newTs = lastMsg?.timestamp || new Date().toISOString();
            // Update the shared dmThreads so sidebar and welcome views
            // reflect the deletion without a page refresh.
            setDmThreads(prev => prev.map(t => t.conversationId === selectedConversation
                ? { ...t, snippet: newSnippet, lastMsgTs: newTs, read: true }
                : t));
            // persist thread update
            if (message.messageId) {
                const [a, b] = selectedConversation.replace("dm#", "").split("___");
                const recipientId = a === userData.userId ? b : a;
                if (THREADS_URL) {
                    await apiFetch(THREADS_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            conversationId: selectedConversation,
                            senderId: userData.userId,
                            recipientId,
                            snippet: newSnippet,
                            timestamp: newTs,
                            preserveRead: true
                        }),
                    });
                }
            }
            if (ws && ws.readyState === WebSocket.OPEN && message.messageId) {
                const deletePayload = {
                    action: "deleteMessage",
                    conversationType: "dm",
                    conversationId: selectedConversation,
                    messageId: message.messageId,
                };
                ws.send(JSON.stringify(normalizeMessage(deletePayload, "deleteMessage")));
            }
        }
        catch (err) {
            console.error("Failed to delete message", err);
        }
    };
    const editMessage = async (message, newText) => {
        if (!message.messageId || !newText)
            return;
        try {
            const res = await apiFetch(`${EDIT_MESSAGE_URL}/direct/${encodeURIComponent(message.messageId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newText,
                    editedBy: userData.userId,
                    conversationId: selectedConversation,
                }),
            });
            if (!res.ok) {
                const err = await res.text();
                console.error('Edit failed:', err);
                return;
            }
            const ts = new Date().toISOString();
            setUserData(prev => {
                if (!prev)
                    return prev;
                const msgs = Array.isArray(prev.messages) ? prev.messages : [];
                return {
                    ...prev,
                    messages: msgs.map(m => m.messageId === message.messageId
                        ? { ...m, text: newText, edited: true, editedAt: ts }
                        : m)
                };
            });
            if (ws && ws.readyState === WebSocket.OPEN) {
                const editPayload = {
                    action: 'editMessage',
                    conversationType: 'dm',
                    conversationId: selectedConversation,
                    messageId: message.messageId,
                    text: newText,
                    timestamp: message.timestamp,
                    editedAt: ts,
                    editedBy: userData.userId,
                };
                ws.send(JSON.stringify(normalizeMessage(editPayload, 'editMessage')));
            }
        }
        catch (err) {
            console.error('Failed to edit message', err);
        }
    };
    const reactToMessage = (messageId, emoji) => {
        if (!messageId || !emoji)
            return;
        toggleReaction(messageId, emoji, userData.userId, selectedConversation, 'dm', ws);
    };
    /**
     * 6️⃣ Build conversation lists.
     */
    const dmConversations = filteredDMUsers.map((user) => {
        const sortedIds = [userData.userId, user.userId].sort();
        const conversationId = `dm#${sortedIds.join("___")}`;
        return {
            id: conversationId,
            title: `${user.firstName} ${user.lastName}` || "Unnamed User",
            profilePicture: user.thumbnail || null,
        };
    });
    let chatTitle = "Select a conversation";
    let chatIcon = null;
    if (selectedConversation) {
        const dmUser = dmConversations.find((u) => u.id === selectedConversation);
        if (dmUser) {
            chatTitle = `Direct Message / ${dmUser.title}`;
            chatIcon = dmUser.profilePicture ? (_jsx("img", { src: dmUser.profilePicture, alt: dmUser.title, style: { width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" } })) : (_jsx(User, { style: { width: "40px", height: "40px", opacity: 0.5 } }));
        }
    }
    /**
     * 9️⃣ Styles for conversation list items.
     */
    const listItemStyle = {
        fontSize: "14px",
        padding: "10px",
        cursor: "pointer",
        borderRadius: "5px",
        marginBottom: "1px",
        transition: "0.2s ease-in-out",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
    };
    return (_jsxs("div", { className: "messages-container", style: { display: isMobile ? "block" : "flex", height: "100%" }, children: [(!isMobile || !showConversation) && (_jsx("div", { className: "sidebar", style: {
                    width: isMobile ? "100%" : "25%",
                    borderRight: isMobile ? "none" : "1px solid #444",
                    background: "#0c0c0c",
                }, children: _jsxs("div", { className: "sidebar-section", children: [_jsx("h3", { style: {
                                fontSize: "18px",
                                background: "linear-gradient(30deg, #181818, #0c0c0c)",
                                padding: "15px",
                                margin: 0,
                            }, children: "# Direct Messages" }), _jsx("div", { style: { maxHeight: isMobile ? "calc(100vh - 150px)" : "400px", overflowY: "auto" }, children: _jsx("ul", { style: { listStyle: "none", padding: 0, margin: 0 }, children: dmConversations.map((conv) => (_jsxs("li", { onClick: () => openConversation(conv.id), style: {
                                        ...listItemStyle,
                                        background: selectedConversation === conv.id ? "#252525" : undefined,
                                        color: selectedConversation === conv.id ? "#fff" : "#bbb",
                                        padding: "10px 15px",
                                        position: 'relative'
                                    }, children: [_jsx("div", { className: "avatar-wrapper", style: { marginRight: "8px" }, children: _jsxs(_Fragment, { children: [conv.profilePicture ? (_jsx("img", { src: conv.profilePicture, alt: conv.title, style: { width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" } })) : (_jsx(User, { style: { width: "32px", height: "32px", opacity: 0.5 } })), onlineUsers.includes(conv.id
                                                        .replace('dm#', '')
                                                        .split('___')
                                                        .find(id => id !== userData.userId)) && _jsx("span", { className: "online-indicator" })] }) }), _jsx("span", { style: { flexGrow: 1, textAlign: "right" }, children: conv.title }), threadMap[conv.id] && (_jsx("span", { style: {
                                                background: '#FA3356',
                                                color: '#fff',
                                                borderRadius: '12px',
                                                padding: '2px 6px',
                                                fontSize: '12px',
                                                marginLeft: '4px'
                                            }, children: "NEW" }))] }, conv.id))) }) })] }) })), (!isMobile || showConversation) && (_jsxs("div", { className: `chat-window ${isDragging ? "dragging" : ""}`, style: {
                    width: isMobile ? "100%" : "75%",
                    display: "flex",
                    flexDirection: "column",
                    padding: "15px",
                    position: "relative",
                    height: "100%"
                }, onDragOver: (e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }, onDragLeave: (e) => {
                    e.preventDefault();
                    setIsDragging(false);
                }, onDrop: (e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleDrop(e);
                }, children: [isMobile && showConversation && (_jsx("button", { onClick: () => setShowConversation(false), style: {
                            position: "absolute",
                            top: 10,
                            left: 10,
                            background: "none",
                            border: "none",
                            color: "#fff",
                            fontSize: "18px",
                            zIndex: 10
                        }, children: "\u2190" })), isLoading && _jsx(SpinnerOverlay, {}), errorMessage && _jsx("div", { className: "error-message", children: errorMessage }), _jsxs("div", { className: "chat-header", style: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "5px", marginBottom: "10px" }, children: [_jsx("h2", { style: { fontSize: "18px" }, children: chatTitle }), chatIcon] }), _jsxs("div", { className: "chat-messages", style: {
                            flexGrow: 1,
                            overflowY: isLoading ? "hidden" : "auto",
                            padding: "10px",
                            background: "#222",
                            borderRadius: "5px",
                            marginBottom: "10px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: messages.length === 0 ? "center" : "flex-start",
                            alignItems: messages.length === 0 ? "center" : "stretch",
                        }, onClick: () => handleMarkRead(selectedConversation), children: [messages.length === 0 && !isLoading ? (_jsx("div", { style: { color: "#aaa", fontSize: "16px", textAlign: "center" }, children: "No messages yet." })) : (messages.map((msg, index) => (_jsx(MessageItem, { msg: msg, prevMsg: messages[index - 1], userData: userData, allUsers: allUsers, openPreviewModal: openPreviewModal, folderKey: folderKey, renderFilePreview: renderFilePreview, getFileNameFromUrl: getFileNameFromUrl, onDelete: (m) => setDeleteTarget(m), onEditRequest: (m) => setEditTarget(m), onReact: reactToMessage }, msg.optimisticId || msg.messageId || msg.timestamp)))), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { style: { display: "flex", gap: "10px", alignItems: "center", position: "relative" }, children: [_jsx("input", { type: "text", placeholder: "Type a message...", value: newMessage, onChange: (e) => setNewMessage(e.target.value), onFocus: () => handleMarkRead(selectedConversation), onKeyDown: (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }, style: {
                                    flexGrow: 1,
                                    padding: "10px",
                                    borderRadius: "6px",
                                    border: "1px solid #444",
                                    background: "#1c1c1c",
                                    color: "#fff",
                                } }), _jsx("button", { onClick: () => setShowEmojiPicker((p) => !p), style: { background: "none", border: "none", cursor: "pointer" }, children: "\uD83D\uDE0A" }), showEmojiPicker && (_jsx("div", { style: {
                                    position: "absolute",
                                    bottom: "40px",
                                    right: "60px",
                                    background: "#333",
                                    padding: "5px",
                                    borderRadius: "8px",
                                    display: "flex",
                                    gap: "4px",
                                }, children: ["😀", "😂", "👍", "❤️", "✅", "💯"].map((em) => (_jsx("span", { style: { cursor: "pointer" }, onClick: () => {
                                        setNewMessage((m) => m + em);
                                        setShowEmojiPicker(false);
                                    }, children: em }, em))) })), _jsx("button", { onClick: sendMessage, style: {
                                    padding: "10px 15px",
                                    background: "#FA3356",
                                    border: "none",
                                    borderRadius: "6px",
                                    color: "#fff",
                                    cursor: "pointer",
                                }, children: "Send" })] }), isDragging && (_jsx("div", { className: "drag-overlay", children: "Drop files to upload" })), _jsx(Modal, { isOpen: isPreviewModalOpen, onRequestClose: closePreviewModal, contentLabel: "File Preview Modal", className: "messages-modal-content", overlayClassName: "messages-modal-overlay", children: selectedPreviewFile && (_jsxs("div", { className: "preview-container", children: [(() => {
                                    const ext = selectedPreviewFile.fileName
                                        .split(".")
                                        .pop()
                                        .toLowerCase();
                                    if (["jpg", "jpeg", "png"].includes(ext)) {
                                        return (_jsx("img", { src: selectedPreviewFile.finalUrl || selectedPreviewFile.url, alt: selectedPreviewFile.fileName, style: { maxWidth: "90vw", maxHeight: "80vh" } }));
                                    }
                                    return renderFilePreview(selectedPreviewFile, folderKey);
                                })(), _jsxs("div", { className: "preview-header", children: [_jsx("button", { onClick: closePreviewModal, className: "modal-button secondary", children: _jsx(FontAwesomeIcon, { icon: faTimes }) }), _jsx("a", { href: selectedPreviewFile.url, download: true, style: { color: "white" }, children: _jsx(FontAwesomeIcon, { icon: faDownload }) })] })] })) }), _jsx(ConfirmModal, { isOpen: !!deleteTarget, onRequestClose: () => setDeleteTarget(null), onConfirm: () => {
                            if (deleteTarget)
                                deleteMessage(deleteTarget);
                            setDeleteTarget(null);
                        }, message: "Delete this message?", className: "messages-modal-content", overlayClassName: "messages-modal-overlay" }), _jsx(PromptModal, { isOpen: !!editTarget, onRequestClose: () => setEditTarget(null), onSubmit: (text) => {
                            if (editTarget)
                                editMessage(editTarget, text);
                            setEditTarget(null);
                        }, message: "Edit message", defaultValue: editTarget?.text || '', className: "messages-modal-content", overlayClassName: "messages-modal-overlay" })] }))] }));
};
export default Messages;
