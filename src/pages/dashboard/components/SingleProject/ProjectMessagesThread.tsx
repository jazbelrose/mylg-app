import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  DragEvent,
  KeyboardEvent,
} from "react";
import { useData } from "../../../../app/contexts/DataProvider";
import { useAuth } from "../../../../app/contexts/AuthContext";
import { useSocket } from "../../../../app/contexts/SocketContext";
import SpinnerOverlay from "../../../../components/SpinnerOverlay";
import OptimisticImage from "../../../../components/OptimisticImage";
import { normalizeMessage } from "../../../../utils/websocketUtils";
import { ChevronDown, ChevronUp, Dock, Move } from "lucide-react";
import { uploadData } from "aws-amplify/storage";
import MessageItem from "./MessageItem";
import "./ProjectMessagesThread.css";
import {
  dedupeById,
  mergeAndDedupeMessages,
} from "../../../../utils/messageUtils";
import { getWithTTL, setWithTTL } from "../../../../utils/storageWithTTL";
import {
  FaFilePdf,
  FaFileExcel,
  FaFileAlt,
  FaDraftingCompass,
  FaCube,
} from "react-icons/fa";
import {
  SiAdobe,
  SiAffinitydesigner,
  SiAffinitypublisher,
  SiSvg,
} from "react-icons/si";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faDownload } from "@fortawesome/free-solid-svg-icons";
import Modal from "../../../../components/ModalWithStack";
import ConfirmModal from "../../../../components/ConfirmModal";
import PromptModal from "../../../../components/PromptModal";
import PDFPreview from "./PDFPreview";
import {
  GET_PROJECT_MESSAGES_URL,
  DELETE_PROJECT_MESSAGE_URL,
  DELETE_FILE_FROM_S3_URL,
  EDIT_MESSAGE_URL,
  S3_PUBLIC_BASE,
  apiFetch,
} from "../../../../utils/api";

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────

type FileObj = {
  fileName: string;
  url: string;
  finalUrl?: string | null;
};

type Message = {
  action?: string;
  conversationType?: string;
  conversationId?: string;
  senderId?: string;
  username?: string;
  title?: string;
  text?: string;
  timestamp: string;
  optimisticId?: string;
  messageId?: string;
  optimistic?: boolean;
  edited?: boolean;
  editedAt?: string;
  file?: FileObj;
  reactions?: Record<string, string[]>; // emoji -> [userId]
};

type GetProjectMessagesResponse = { Items?: Message[] } | Message[];

type PatchEditMessageResponse = { ok?: boolean; [k: string]: unknown };
type DeleteMessageResponse = { ok?: boolean; [k: string]: unknown };
type DeleteS3FilesResponse = { ok?: boolean; [k: string]: unknown };

type ProjectMessagesThreadProps = {
  projectId: string;
  open: boolean;
  setOpen: (fn: (v: boolean) => boolean | boolean) => void;
  floating: boolean;
  setFloating: (fn: (v: boolean) => boolean | boolean) => void;
  startDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  headerOffset?: number;
};

// ───────────────────────────────────────────────────────────────────────────────
// Utils
// ───────────────────────────────────────────────────────────────────────────────

const pmKey = (pid: string) => `project_messages_${pid}`;

if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

// Updated default folder key to "chat_uploads"
const getThumbnailUrl = (url: string, folderKey = "chat_uploads") =>
  url.replace(`/${folderKey}/`, `/${folderKey}_thumbnails/`);

// Helper to extract filename from URL.
const getFileNameFromUrl = (url: string) => url.split("/").pop() || url;

// Custom file preview function.
const renderFilePreview = (file: FileObj, folderKey = "chat_uploads") => {
  const extension = file.fileName.split(".").pop()?.toLowerCase() || "";
  const commonStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  };
  const fileNameStyle: React.CSSProperties = {
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  };

  if (["jpg", "jpeg", "png"].includes(extension)) {
    const thumbnailUrl = getThumbnailUrl(file.url, folderKey);
    const finalUrl = file.finalUrl || file.url;
    return (
      <OptimisticImage
        tempUrl={thumbnailUrl}
        finalUrl={finalUrl}
        alt={file.fileName}
      />
    );
  } else if (extension === "pdf") {
    return (
      <div style={commonStyle}>
        <FaFilePdf size={50} color="red" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (extension === "svg") {
    return (
      <div style={commonStyle}>
        <SiSvg size={50} color="purple" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (extension === "txt") {
    return (
      <div style={commonStyle}>
        <FaFileAlt size={50} color="gray" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (["xls", "xlsx", "csv"].includes(extension)) {
    return (
      <div style={commonStyle}>
        <FaFileExcel size={50} color="green" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (["dwg", "vwx"].includes(extension)) {
    return (
      <div style={commonStyle}>
        <FaDraftingCompass size={50} color="brown" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (["c4d", "obj"].includes(extension)) {
    return (
      <div style={commonStyle}>
        <FaCube size={50} color="purple" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (extension === "ai") {
    return (
      <div style={commonStyle}>
        <SiAdobe size={50} color="orange" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (extension === "afdesign") {
    return (
      <div style={commonStyle}>
        <SiAffinitydesigner size={50} color="orange" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (extension === "afpub") {
    return (
      <div style={commonStyle}>
        <SiAffinitypublisher size={50} color="green" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (extension === "js") {
    return (
      <div style={commonStyle}>
        <FaFileAlt size={50} color="blue" style={{ fill: "blue" }} />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else if (extension === "eps") {
    return (
      <div style={commonStyle}>
        <FaDraftingCompass size={50} color="brown" />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  } else {
    return (
      <div style={commonStyle}>
        <FaFileAlt size={50} color="blue" style={{ fill: "blue" }} />
        <span style={fileNameStyle}>{file.fileName}</span>
      </div>
    );
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────────

const ProjectMessagesThread: React.FC<ProjectMessagesThreadProps> = ({
  projectId,
  open,
  setOpen,
  floating,
  setFloating,
  startDrag,
  headerOffset = 0,
}) => {
  const {
    activeProject,
    user,
    userData,
    allUsers,
    isAdmin,
    projectMessages,
    setProjectMessages,
    deletedMessageIds,
    markMessageDeleted,
    toggleReaction,
  } = useData() as any;
  const { ws } = useSocket() || ({} as any);
  const { isAuthenticated } = useAuth() as any;

  const messages = useMemo(() => {
    const all: Message[] = Array.isArray(projectMessages[projectId])
      ? projectMessages[projectId]
      : [];
    const filtered = all.filter(
      (m: Message) =>
        !(
          deletedMessageIds.has(m.messageId) ||
          deletedMessageIds.has(m.optimisticId)
        )
    );
    return dedupeById(filtered) as Message[];
  }, [projectMessages, projectId, deletedMessageIds]);

  const [isLoading, setIsLoading] = useState(
    () => !projectMessages[projectId]?.length
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // File preview modal
  const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPreviewFile, setSelectedPreviewFile] =
    useState<FileObj | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [editTarget, setEditTarget] = useState<Message | null>(null);

  // CHANGED: folder key
  const folderKey = "chat_uploads";

  // Load cached messages for this project first
  useEffect(() => {
    if (!projectId) return;
    const stored = getWithTTL(pmKey(projectId));
    if (!Array.isArray(stored) || !stored.length) return;

    setProjectMessages((prev: any) => {
      const existing: Message[] = Array.isArray(prev[projectId])
        ? prev[projectId]
        : [];
      if (existing.length) return prev;
      return {
        ...prev,
        [projectId]: mergeAndDedupeMessages(existing, stored),
      };
    });
  }, [projectId, setProjectMessages]);

  // Persist messages
  useEffect(() => {
    if (projectId) {
      setWithTTL(pmKey(projectId), messages);
    }
  }, [messages, projectId]);

  const openPreviewModal = (file: FileObj) => {
    setSelectedPreviewFile(file);
    setPreviewModalOpen(true);
  };
  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    setSelectedPreviewFile(null);
  };

  // WebSocket delete listener
  useEffect(() => {
    if (!ws) return;
    const handleWsMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.action === "deleteMessage" &&
          data.conversationType === "project"
        ) {
          const pid =
            data.projectId ||
            (data.conversationId || "").replace("project#", "");
          if (pid === projectId) {
            markMessageDeleted(data.messageId || data.optimisticId);
            setProjectMessages((prev: any) => {
              const msgs: Message[] = Array.isArray(prev[pid]) ? prev[pid] : [];
              const updated = msgs.filter(
                (m) =>
                  !(
                    (data.messageId && m.messageId === data.messageId) ||
                    (data.optimisticId &&
                      m.optimisticId === data.optimisticId)
                  )
              );
              setWithTTL(pmKey(pid), updated);
              return { ...prev, [pid]: updated };
            });
          }
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };
    ws.addEventListener("message", handleWsMessage);
    return () => {
      ws.removeEventListener("message", handleWsMessage);
    };
  }, [ws, projectId, setProjectMessages, markMessageDeleted]);

  // Join conversation
  useEffect(() => {
    if (!ws || !projectId) return;
    const payload = JSON.stringify({
      action: "setActiveConversation",
      conversationId: `project#${projectId}`,
    });
    const sendWhenReady = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      } else {
        const onOpen = () => {
          ws.send(payload);
          ws.removeEventListener("open", onOpen);
        };
        ws.addEventListener("open", onOpen);
      }
    };
    sendWhenReady();
  }, [ws, projectId]);

  // Initial fetch (only when not present)
  useEffect(() => {
    if (!projectId || !isAuthenticated) {
      if (!projectId) setIsLoading(false);
      return;
    }
    if (projectMessages[projectId] !== undefined) {
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true);
      const maxRetries = 5;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const data = await apiFetch<GetProjectMessagesResponse>(
            `${GET_PROJECT_MESSAGES_URL}?projectId=${projectId}`,
            attempt > 0 ? { skipRateLimit: true } : undefined
          );

          const asArray = Array.isArray(data) ? data : data.Items || [];
          const filtered = asArray.filter(
            (m: Message) =>
              !(
                deletedMessageIds.has(m.messageId) ||
                deletedMessageIds.has(m.optimisticId)
              )
          );
          const deduped = dedupeById(filtered);

          setProjectMessages((prev: any) => ({
            ...prev,
            [projectId]: deduped,
          }));
          setWithTTL(pmKey(projectId), deduped);

          setIsLoading(false);
          return;
        } catch (error: any) {
          if (
            error.message?.includes("Rate limit exceeded") &&
            attempt < maxRetries
          ) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          console.error("Error fetching project messages:", error);
          setProjectMessages((prev: any) => ({ ...prev, [projectId]: [] }));
          setWithTTL(pmKey(projectId), []);
          setErrorMessage(
            error.message?.includes("Rate limit")
              ? "Too many requests. Please try again later."
              : "Failed to load messages."
          );
          break;
        }
      }
      setIsLoading(false);
    };

    fetchMessages();
  }, [
    projectId,
    isAuthenticated,
    deletedMessageIds,
    setProjectMessages,
    projectMessages,
  ]);

  // Scroll handling
  const prevCountRef = useRef(messages.length);
  const initialLoadRef = useRef(true);
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (initialLoadRef.current) {
      container.scrollTop = container.scrollHeight;
      prevCountRef.current = messages.length;
      initialLoadRef.current = false;
      return;
    }

    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      20;
    const diff = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;

    if (diff > 0 && atBottom) {
      container.scrollTo({ top: container.scrollHeight });
    } else if (atBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Resize: keep at bottom when already at bottom
  useEffect(() => {
    const handleResize = () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        20;
      if (atBottom) container.scrollTop = container.scrollHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Send text
  const sendMessage = () => {
    if (!projectId) {
      console.warn("No projectId selected.");
      return;
    }
    if (!newMessage.trim()) {
      console.warn("sendMessage aborted: empty.");
      return;
    }

    const timestamp = new Date().toISOString();
    const optimisticId =
      Date.now() + "-" + Math.random().toString(36).slice(2);

    const messageData: Message = {
      action: "sendMessage",
      conversationType: "project",
      conversationId: `project#${projectId}`,
      senderId: userData?.userId,
      username: (user as any)?.firstName || "Someone",
      title: (activeProject as any)?.title || projectId,
      text: newMessage,
      timestamp,
      optimisticId,
      // @ts-expect-error user.id from your app
      userId: (user as any).id,
    } as any;

    const optimisticMessage: Message = { ...messageData, optimistic: true };

    setProjectMessages((prev: any) => {
      const msgs: Message[] = Array.isArray(prev[projectId])
        ? prev[projectId]
        : [];
      const merged = mergeAndDedupeMessages(msgs, [optimisticMessage]);
      setWithTTL(pmKey(projectId), merged);
      return { ...prev, [projectId]: merged };
    });

    const maxAttempts = 5;
    const trySend = (attempts = 0) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          try {
            ws.close();
          } catch {}
        }
        if (attempts < maxAttempts) {
          setTimeout(() => trySend(attempts + 1), 1000);
        } else {
          console.error("Failed to send after", maxAttempts, "attempts.");
        }
        return;
      }
      try {
        ws.send(JSON.stringify(normalizeMessage(messageData, "sendMessage")));
        setNewMessage("");
      } catch (error) {
        console.error("Error sending WS message:", error);
        setSendError("Failed to send message.");
      }
    };
    trySend();
  };

  // Upload helper
  const handleFileUpload = async (
    pid: string,
    file: File
  ): Promise<FileObj | undefined> => {
    const filename = `projects/${pid}/${folderKey}/${file.name}`;
    try {
      await uploadData({
        key: filename,
        data: file,
        options: { accessLevel: "public" },
      });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // deliberate delay
      const fileUrl = `${S3_PUBLIC_BASE}/${filename}`;
      return { fileName: file.name, url: fileUrl };
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  // Drag & drop uploads
  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;

    for (const file of files) {
      const tempUrl = URL.createObjectURL(file);
      const optimisticId = Date.now() + "-" + file.name;
      const timestamp = new Date().toISOString();

      const optimisticMessage: Message = {
        action: "sendMessage",
        conversationType: "project",
        conversationId: `project#${projectId}`,
        senderId: userData?.userId,
        text: tempUrl,
        file: { fileName: file.name, url: tempUrl, finalUrl: null },
        timestamp,
        optimisticId,
        optimistic: true,
      };

      setProjectMessages((prev: any) => {
        const msgs: Message[] = Array.isArray(prev[projectId])
          ? prev[projectId]
          : [];
        const merged = mergeAndDedupeMessages(msgs, [optimisticMessage]);
        setWithTTL(pmKey(projectId), merged);
        return { ...prev, [projectId]: merged };
      });

      try {
        const uploadedFile = await handleFileUpload(projectId, file);
        if (!uploadedFile) throw new Error("File upload failed");

        setProjectMessages((prev: any) => {
          const msgs: Message[] = Array.isArray(prev[projectId])
            ? prev[projectId]
            : [];
          const updated = msgs.map((msg) =>
            msg.optimisticId === optimisticId
              ? {
                  ...msg,
                  text: uploadedFile.url,
                  file: {
                    ...msg.file!,
                    finalUrl: uploadedFile.url,
                    url: uploadedFile.url,
                  },
                  optimistic: false,
                }
              : msg
          );
          setWithTTL(pmKey(projectId), updated);
          return { ...prev, [projectId]: updated };
        });

        if (ws && ws.readyState === WebSocket.OPEN) {
          const messageData: Message = {
            action: "sendMessage",
            conversationType: "project",
            conversationId: `project#${projectId}`,
            title: (activeProject as any)?.title,
            senderId: userData?.userId,
            text: uploadedFile.url,
            file: uploadedFile,
            timestamp,
            optimisticId,
            username: (user as any)?.firstName || "Someone",
          };
          ws.send(JSON.stringify(normalizeMessage(messageData, "sendMessage")));
        }
      } catch (error) {
        console.error("Upload failed:", error);
        setProjectMessages((prev: any) => {
          const msgs: Message[] = Array.isArray(prev[projectId])
            ? prev[projectId]
            : [];
          const updated = msgs.filter((msg) => msg.optimisticId !== optimisticId);
          setWithTTL(pmKey(projectId), updated);
          return { ...prev, [projectId]: updated };
        });
      } finally {
        URL.revokeObjectURL(tempUrl);
      }
    }
  };

  // Delete
  const deleteMessage = async (message: Message) => {
    const id = message.messageId || message.optimisticId;
    if (!id) return;

    try {
      // Delete S3 file if present
      if (message.file?.url) {
        const fileUrl = message.file.url;
        await apiFetch<DeleteS3FilesResponse>(DELETE_FILE_FROM_S3_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            field: folderKey,
            fileKeys: [fileUrl],
          }),
        });
      }

      // Delete message from backend (if it has a server id)
      if (message.messageId) {
        const url =
          `${DELETE_PROJECT_MESSAGE_URL}?` +
          `projectId=${encodeURIComponent(projectId)}` +
          `&messageId=${encodeURIComponent(message.messageId)}`;
        await apiFetch<DeleteMessageResponse>(url, { method: "DELETE" });
      }

      // Optimistic local removal
      setProjectMessages((prev: any) => {
        const msgs: Message[] = Array.isArray(prev[projectId])
          ? prev[projectId]
          : [];
        const updated = msgs.filter(
          (m) => (m.messageId || m.optimisticId) !== id
        );
        setWithTTL(pmKey(projectId), updated);
        return { ...prev, [projectId]: updated };
      });

      markMessageDeleted(id);

      if (ws && ws.readyState === WebSocket.OPEN && message.messageId) {
        const deletePayload = {
          action: "deleteMessage",
          conversationType: "project",
          conversationId: `project#${projectId}`,
          messageId: message.messageId,
        };
        ws.send(JSON.stringify(normalizeMessage(deletePayload, "deleteMessage")));
      }
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  // Edit
  const editMessage = async (message: Message, newText: string) => {
    if (!message.messageId || !newText) return;
    try {
      await apiFetch<PatchEditMessageResponse>(
        `${EDIT_MESSAGE_URL}/project/${encodeURIComponent(message.messageId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: newText,
            editedBy: (userData as any).userId,
            projectId,
          }),
        }
      );

      const ts = new Date().toISOString();
      setProjectMessages((prev: any) => {
        const msgs: Message[] = Array.isArray(prev[projectId])
          ? prev[projectId]
          : [];
        const updated = msgs.map((m) =>
          m.messageId === message.messageId
            ? { ...m, text: newText, edited: true, editedAt: ts }
            : m
        );
        setWithTTL(pmKey(projectId), updated);
        return { ...prev, [projectId]: updated };
      });

      if (ws && ws.readyState === WebSocket.OPEN) {
        const editPayload = {
          action: "editMessage",
          conversationType: "project",
          conversationId: `project#${projectId}`,
          projectId,
          messageId: message.messageId,
          text: newText,
          timestamp: message.timestamp,
          editedAt: ts,
          editedBy: (userData as any).userId,
        };
        ws.send(JSON.stringify(normalizeMessage(editPayload, "editMessage")));
      }
    } catch (err) {
      console.error("Failed to edit message", err);
    }
  };

  // Reactions
  const reactToMessage = (messageId?: string, emoji?: string) => {
    if (!messageId || !emoji) return;
    toggleReaction(
      messageId,
      emoji,
      (userData as any).userId,
      `project#${projectId}`,
      "project",
      ws
    );
  };

  return (
    <>
      <div
        className={`project-messages ${isDragging ? "dragging" : ""} ${
          !open ? "closed" : ""
        } ${floating ? "floating" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: floating ? (open ? "100%" : "50px") : "100%",
          overflow: floating && !open ? "hidden" : "visible",
          borderRadius: open ? "20px" : "10px",
          backgroundColor: "transparent",
          position: floating ? "relative" : "sticky",
          top: floating ? undefined : headerOffset,
          maxHeight: floating ? undefined : `calc(100vh - ${headerOffset}px)`,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleDrop(e);
        }}
      >
        {isLoading && <SpinnerOverlay />}
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <div
          className="thread-panel-header chat-panel-header"
          onMouseDown={startDrag}
        >
          <h3 className="project-thread-title">
            # {(activeProject as any)?.title || projectId} Thread
          </h3>
          <div>
            {floating && (
              <button
                className="icon-btn"
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Collapse" : "Expand"}
                title={open ? "Collapse" : "Expand"}
              >
                {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
            <button
              className="icon-btn"
              onClick={() => setFloating((f) => !f)}
              aria-label={floating ? "Dock" : "Float"}
              title={floating ? "Dock" : "Float"}
            >
              {floating ? <Dock size={16} /> : <Move size={16} />}
            </button>
          </div>
        </div>

        {open && (
          <div
            className="chat-messages"
            ref={messagesContainerRef}
            style={{
              flexGrow: 1,
              overflowY: "auto",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: messages.length === 0 ? "center" : "flex-start",
              alignItems: messages.length === 0 ? "center" : "stretch",
            }}
          >
            {messages.length === 0 && !isLoading ? (
              <div
                style={{ color: "#aaa", fontSize: "16px", textAlign: "center" }}
              >
                No messages yet.
              </div>
            ) : (
              messages.map((msg, index) => (
                <MessageItem
                  key={msg.messageId || msg.optimisticId || msg.timestamp}
                  msg={msg as any}
                  prevMsg={messages[index - 1] as any}
                  userData={userData}
                  allUsers={allUsers}
                  openPreviewModal={openPreviewModal}
                  folderKey={folderKey}
                  renderFilePreview={renderFilePreview}
                  getFileNameFromUrl={getFileNameFromUrl}
                  onDelete={(m: Message) => setDeleteTarget(m)}
                  onEditRequest={(m: Message) => setEditTarget(m)}
                  onReact={reactToMessage}
                />
              ))
            )}
            {messages.length > 0 && <div />}
          </div>
        )}

        {open && (
          <div className="message-input-container">
            <input
              type="text"
              placeholder="Type a message or drag files here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="message-input"
            />
            <button onClick={sendMessage} className="send-button">
              Send
            </button>
          </div>
        )}

        {sendError && <div className="error-message">{sendError}</div>}
        {isDragging && <div className="drag-overlay">Drop files to upload</div>}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onRequestClose={closePreviewModal}
        contentLabel="File Preview Modal"
        className="messages-modal-content"
        overlayClassName="messages-modal-overlay"
      >
        {selectedPreviewFile && (
          <div className="preview-container">
            {(() => {
              const ext =
                selectedPreviewFile.fileName.split(".").pop()?.toLowerCase() ||
                "";
              if (["jpg", "jpeg", "png"].includes(ext)) {
                return (
                  <img
                    src={
                      selectedPreviewFile.finalUrl || selectedPreviewFile.url
                    }
                    alt={selectedPreviewFile.fileName}
                    className="preview-image"
                  />
                );
              } else if (ext === "pdf") {
                return (
                  <PDFPreview
                    url={selectedPreviewFile.finalUrl || selectedPreviewFile.url}
                    className="preview-pdf"
                    title={selectedPreviewFile.fileName}
                  />
                );
              } else {
                return renderFilePreview(selectedPreviewFile, folderKey);
              }
            })()}

            <div className="preview-header">
              <button
                onClick={closePreviewModal}
                className="modal-button secondary"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
              <a
                href={selectedPreviewFile.url}
                download
                style={{ color: "white" }}
                aria-label="Download"
                title="Download"
              >
                <FontAwesomeIcon icon={faDownload} />
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onRequestClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMessage(deleteTarget);
          setDeleteTarget(null);
        }}
        message="Delete this message?"
        className="messages-modal-content"
        overlayClassName="messages-modal-overlay"
      />

      {/* Edit prompt */}
      <PromptModal
        isOpen={!!editTarget}
        onRequestClose={() => setEditTarget(null)}
        onSubmit={(text) => {
          if (editTarget) editMessage(editTarget, text);
          setEditTarget(null);
        }}
        message="Edit message"
        defaultValue={editTarget?.text || ""}
        className="messages-modal-content"
        overlayClassName="messages-modal-overlay"
      />
    </>
  );
};

export default ProjectMessagesThread;
