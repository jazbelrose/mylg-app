import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { dedupeById, mergeAndDedupeMessages } from "../../../../utils/messageUtils";
import { getWithTTL, setWithTTL } from "../../../../utils/storageWithTTL";




// Removed toast import since we no longer use it
// import { toast } from "react-toastify";

// Import icons for file types:
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
import PDFPreview from "./PDFPreview.jsx";
import {
  GET_PROJECT_MESSAGES_URL,
  DELETE_PROJECT_MESSAGE_URL,
  DELETE_FILE_FROM_S3_URL,
  EDIT_MESSAGE_URL,
  S3_PUBLIC_BASE,
  apiFetch,
} from "../../../../utils/api";

const pmKey = (pid) => `project_messages_${pid}`;
if (typeof document !== 'undefined') {
  Modal.setAppElement("#root");
}

// Updated default folder key to "chat_uploads"
const getThumbnailUrl = (url, folderKey = "chat_uploads") => {
  return url.replace(`/${folderKey}/`, `/${folderKey}_thumbnails/`);
};


// Helper to extract filename from URL.
const getFileNameFromUrl = (url) => url.split("/").pop();


// Custom file preview function.
// For images, renders the image; for non-image files, renders the corresponding icon along with the file name.
const renderFilePreview = (file, folderKey = "chat_uploads") => {
  const extension = file.fileName.split(".").pop().toLowerCase();
  const commonStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  };
  const fileNameStyle = {
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
  
  }else if (extension === "eps") {
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

const ProjectMessagesThread = ({ projectId, open, setOpen, floating, setFloating, startDrag, headerOffset = 0 }) => {
  const { activeProject, user, userData, allUsers, isAdmin, projectMessages, setProjectMessages, deletedMessageIds, markMessageDeleted, toggleReaction } = useData();
  const { ws } = useSocket();
  const { isAuthenticated } = useAuth();
  // Messages come from global context. We dedupe here so that optimistic
  // entries and server responses don't create duplicates in the UI.
  const messages = useMemo(() => {
    const all = Array.isArray(projectMessages[projectId]) ? projectMessages[projectId] : [];
    const filtered = all.filter(
      (m) =>
        !(
          deletedMessageIds.has(m.messageId) ||
          deletedMessageIds.has(m.optimisticId)
        )
    );
    return dedupeById(filtered);
  }, [projectMessages, projectId, deletedMessageIds]);
  // Avoid showing the loading spinner when messages are already cached for
  // this project (e.g., when switching dashboard tabs). Only fetch from the
  // server if no messages exist for the active project.
  const [isLoading, setIsLoading] = useState(() => !projectMessages[projectId]?.length);
  const [errorMessage, setErrorMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const messagesContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // State for file preview modal (when a file is clicked inside the chat)
  const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  // CHANGED: folder key from "uploads" to "chat_uploads"
  const folderKey = "chat_uploads";

  // Load cached messages for this project. Avoid resetting context
  // state if messages are already present to prevent the thread from
  // "refreshing" when navigating around the dashboard.
  useEffect(() => {
    if (!projectId) return;
    const stored = getWithTTL(pmKey(projectId));
    if (!Array.isArray(stored) || !stored.length) return;
    setProjectMessages((prev) => {
      const existing = Array.isArray(prev[projectId]) ? prev[projectId] : [];
      if (existing.length) return prev;
      return {
        ...prev,
        [projectId]: mergeAndDedupeMessages(existing, stored),
      };
    });
  }, [projectId, setProjectMessages]);

  // Persist messages whenever they change
  useEffect(() => {
    if (projectId) {
      setWithTTL(pmKey(projectId), messages);
    }
  }, [messages, projectId]);
  
 

  // Function to open the preview modal for a file.
  const openPreviewModal = (file) => {
    setSelectedPreviewFile(file);
    setPreviewModalOpen(true);
  };

  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    setSelectedPreviewFile(null);
  };

    // Listen for deleteMessage events coming from the WebSocket so that when
  // another user deletes a message we immediately remove it from context.
  useEffect(() => {
    if (!ws) return;

    const handleWsMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.action === 'deleteMessage' &&
          data.conversationType === 'project'
        ) {
          const pid = data.projectId || (data.conversationId || '').replace('project#', '');
          if (pid === projectId) {
            markMessageDeleted(data.messageId || data.optimisticId);
            setProjectMessages((prev) => {
              const msgs = Array.isArray(prev[pid]) ? prev[pid] : [];
              const updated = msgs.filter(
                (m) =>
                  !(
                    (data.messageId && m.messageId === data.messageId) ||
                    (data.optimisticId && m.optimisticId === data.optimisticId)
                  )
              );
              setWithTTL(pmKey(pid), updated);
              return {
                ...prev,
                [pid]: updated,
              };
            });
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.addEventListener('message', handleWsMessage);
    return () => {
      ws.removeEventListener('message', handleWsMessage);
    };
  }, [ws, projectId, setProjectMessages, markMessageDeleted]);

  useEffect(() => {
  if (!ws || !projectId) return;

  const payload = JSON.stringify({
    action: 'setActiveConversation',
    conversationId: `project#${projectId}`
  });

  const sendWhenReady = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else {
      const onOpen = () => {
        ws.send(payload);
        ws.removeEventListener('open', onOpen);
      };
      ws.addEventListener('open', onOpen);
    }
  };

  sendWhenReady();
}, [ws, projectId]);

  

  // updates handled via SocketContext

  useEffect(() => {
    if (!projectId || !isAuthenticated) {
      if (!projectId) {
        setIsLoading(false);
      }
      return;
    }

    // If messages for this project are already loaded (even if empty), avoid
    // refetching on re-mount. WebSocket updates will keep them fresh.
    if (projectMessages[projectId] !== undefined) {
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true);
      const maxRetries = 5;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log("📡 Fetching project messages for:", projectId);
          const res = await apiFetch(
            `${GET_PROJECT_MESSAGES_URL}?projectId=${projectId}`,
            attempt > 0 ? { skipRateLimit: true } : undefined
          );
          const data = await res.json();
          if (Array.isArray(data)) {
            const filtered = data.filter(
              (m) =>
                !(
                  deletedMessageIds.has(m.messageId) ||
                  deletedMessageIds.has(m.optimisticId)
                )
            );
            setProjectMessages(prev => ({
              ...prev,
              [projectId]: dedupeById(filtered),
            }));
            setWithTTL(pmKey(projectId), dedupeById(filtered));
          } else {
            setProjectMessages(prev => ({ ...prev, [projectId]: [] }));
            setWithTTL(pmKey(projectId), []);
          }
          setIsLoading(false);
          return;
        } catch (error) {
          if (error.message.includes("Rate limit exceeded") && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          console.error("Error fetching project messages:", error);
          setProjectMessages(prev => ({ ...prev, [projectId]: [] }));
          setWithTTL(pmKey(projectId), []);
          setErrorMessage(
            error.message.includes("Rate limit")
              ? "Too many requests. Please try again later."
              : "Failed to load messages."
          );
          break;
        }
      }
      setIsLoading(false);
    };
    fetchMessages();
  }, [projectId, isAuthenticated, deletedMessageIds, setProjectMessages]);

  // Scroll handling: only auto-scroll for new messages when user is at bottom
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
      container.scrollHeight - container.scrollTop - container.clientHeight < 20;
    const diff = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;

    if (diff > 0 && atBottom) {
      container.scrollTo({ top: container.scrollHeight });
    } else if (atBottom) {
      // maintain bottom position when content height changes
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Ensure the input stays visible by scrolling to the bottom on window resize
  useEffect(() => {
    const handleResize = () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 20;
      if (atBottom) {
        container.scrollTop = container.scrollHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  

  // Send a text message. We create an optimistic copy so the UI updates
  // immediately and then replace it when the server echoes the real message.
  const sendMessage = () => {
    if (!projectId) {
      console.warn("No projectId selected.");
      return;
    }
    if (!newMessage.trim()) {
      console.warn("🚨 sendMessage aborted: Message is empty.");
      return;
    }
    const timestamp = new Date().toISOString();
    const optimisticId = Date.now() + '-' + Math.random().toString(36).slice(2);

const messageData = {
  action: "sendMessage",
  conversationType: "project",
  conversationId: `project#${projectId}`,
  senderId: userData?.userId,
  username: user?.firstName || 'Someone',         // ✅ Add username
  title: activeProject?.title || projectId,       // ✅ Add project name
  text: newMessage,
  timestamp,
  optimisticId,
  userId:         user.id,
};

    // Add the optimistic message to the context so it appears instantly.
    const optimisticMessage = { ...messageData, optimistic: true };
    setProjectMessages(prev => {
      const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
      const merged = mergeAndDedupeMessages(msgs, [optimisticMessage]);
      setWithTTL(pmKey(projectId), merged);
      return {
        ...prev,
        [projectId]: merged,
      };
    });

    const maxAttempts = 5;
    const trySendMessage = (attempts = 0) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not open. Attempt:", attempts);
        if (ws && ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
        if (attempts < maxAttempts) {
          setTimeout(() => trySendMessage(attempts + 1), 1000);
        } else {
          console.error("Failed to send message after", maxAttempts, "attempts.");
        }
        return;
      }
      try {
        ws.send(JSON.stringify(normalizeMessage(messageData, "sendMessage")));
        console.log("✅ Message successfully sent!");
        setNewMessage("");
      } catch (error) {
        console.error("❌ Error sending WebSocket message:", error);
         setSendError("Failed to send message.");
      }
    };
    console.log("📤 Sending message:", messageData);
    trySendMessage();
  };

  // Drag and Drop Handlers for File Uploads.
  const handleDrop = async (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;

    for (const file of files) {
      const tempUrl = URL.createObjectURL(file);
      const optimisticId = Date.now() + "-" + file.name;
      const timestamp = new Date().toISOString();

        // Create an optimistic file object using the temporary URL so the
      // placeholder appears in the chat while uploading.
      const optimisticMessage = {
        action: "sendMessage",
        conversationType: "project",
        conversationId: `project#${projectId}`,
        senderId: userData?.userId,
        text: tempUrl, // Initial temporary URL
        file: {
          fileName: file.name,
          url: tempUrl,
          finalUrl: null, // Field to store the final URL
        },
        timestamp,
        optimisticId,
        optimistic: true,
      };

      // Immediately add an optimistic message to the context with the tempUrl.
      setProjectMessages(prev => {
        const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
        const merged = mergeAndDedupeMessages(msgs, [optimisticMessage]);
        setWithTTL(pmKey(projectId), merged);
        return {
          ...prev,
          [projectId]: merged,
        };
      });

      try {
        // Now start uploading the file.
        const uploadedFile = await handleFileUpload(projectId, file);
        if (!uploadedFile) throw new Error("File upload failed");

       
         // Once uploaded, update the optimistic message with the final URL so it
        // matches the server copy when it arrives.
        setProjectMessages(prev => {
          const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
          const updated = msgs.map(msg =>
            msg.optimisticId === optimisticId
              ? {
                  ...msg,
                  text: uploadedFile.url,
                  file: { ...msg.file, finalUrl: uploadedFile.url, url: uploadedFile.url },
                  optimistic: false,
                }
              : msg
          );
          setWithTTL(pmKey(projectId), updated);
          return { ...prev, [projectId]: updated };
        });

        // Send the actual message via WebSocket with the final file URL.
        if (ws && ws.readyState === WebSocket.OPEN) {
          const messageData = {
            action: "sendMessage",
            conversationType: "project",
            conversationId: `project#${projectId}`,
            title: activeProject.title,
            senderId: userData?.userId,
            text: uploadedFile.url,
            file: uploadedFile,
            timestamp,
            optimisticId,
            username: user?.firstName || 'Someone'
            
          };
           ws.send(
            JSON.stringify(normalizeMessage(messageData, "sendMessage"))
          );
        }
      } catch (error) {
        console.error("Upload failed:", error);
        // Optionally remove the optimistic message if upload fails.
        setProjectMessages(prev => {
          const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
          const updated = msgs.filter(msg => msg.optimisticId !== optimisticId);
          setWithTTL(pmKey(projectId), updated);
          return { ...prev, [projectId]: updated };
        });
      } finally {
        URL.revokeObjectURL(tempUrl);
      }
    }
  };
  // Delete a message and broadcast the deletion to other users. The local copy
  // is removed optimistically and will also be removed again when the WS frame
  // arrives.
  const deleteMessage = async (message) => {
  const id = message.messageId || message.optimisticId;
  if (!id) return;

  try {
        if (message.file?.url) {
      const fileUrl = message.file.url;
      await apiFetch(DELETE_FILE_FROM_S3_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          field: folderKey,
          fileKeys: [fileUrl]
        })
      });

    }
    if (message.messageId) {
      // include both projectId and messageId
      const url = `${DELETE_PROJECT_MESSAGE_URL}?` +
                  `projectId=${encodeURIComponent(projectId)}` +
                  `&messageId=${encodeURIComponent(message.messageId)}`;

      const res = await apiFetch(url, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        console.error("Delete failed:", err);
        return;
      }
    }

              // optimistically remove from UI
      // Remove the message from context immediately so the UI updates without wait.
      setProjectMessages(prev => {
        const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
        const updated = msgs.filter(m => (m.messageId || m.optimisticId) !== id);
        setWithTTL(pmKey(projectId), updated);
        return { ...prev, [projectId]: updated };
      });

      // Keep track locally so server fetches don't bring the message back
      markMessageDeleted(id);

      // Broadcast deletion via WebSocket
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

  const editMessage = async (message, newText) => {
    if (!message.messageId || !newText) return;
    try {
      const res = await apiFetch(
        `${EDIT_MESSAGE_URL}/project/${encodeURIComponent(message.messageId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newText,
            editedBy: userData.userId,
            projectId,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error('Edit failed:', err);
        return;
      }

      const ts = new Date().toISOString();
      setProjectMessages(prev => {
        const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
        const updated = msgs.map(m =>
          m.messageId === message.messageId
            ? { ...m, text: newText, edited: true, editedAt: ts }
            : m
        );
        setWithTTL(pmKey(projectId), updated);
        return { ...prev, [projectId]: updated };
      });

      if (ws && ws.readyState === WebSocket.OPEN) {
        const editPayload = {
          action: 'editMessage',
          conversationType: 'project',
          conversationId: `project#${projectId}`,
          projectId,
          messageId: message.messageId,
          text: newText,
          timestamp: message.timestamp,
          editedAt: ts,
          editedBy: userData.userId,
        };
        ws.send(JSON.stringify(normalizeMessage(editPayload, 'editMessage')));
      }
    } catch (err) {
      console.error('Failed to edit message', err);
    }
  };


  // Actual file upload function using aws-amplify's uploadData.
  const handleFileUpload = async (projectId, file) => {
    const filename = `projects/${projectId}/${folderKey}/${file.name}`;
   
    try {
      await uploadData({
        key: filename,
        data: file,
        options: { accessLevel: "public" },
      });
      // Faking an extra wait
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fileUrl = `${S3_PUBLIC_BASE}/${filename}`;
      console.log(`File uploaded: ${file.name}`);
      return { fileName: file.name, url: fileUrl };
    } catch (error) {
      console.error("Error uploading file:", error);
    
    }
  };

  const reactToMessage = (messageId, emoji) => {
    if (!messageId || !emoji) return;
    toggleReaction(
      messageId,
      emoji,
      userData.userId,
      `project#${projectId}`,
      'project',
      ws
    );
  };



  return (
    <>
      <div
        className={`project-messages ${isDragging ? "dragging" : ""} ${!open ? "closed" : ""} ${floating ? "floating" : ""}`}
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
        <div className="thread-panel-header chat-panel-header" onMouseDown={startDrag}>
          <h3 className="project-thread-title">
            {`# ${activeProject?.title || projectId} Thread`}
          </h3>
          <div>
            {floating && (
              <button
                className="icon-btn"
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Collapse' : 'Expand'}
                title={open ? 'Collapse' : 'Expand'}
              >
                {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
            <button
              className="icon-btn"
              onClick={() => setFloating(f => !f)}
              aria-label={floating ? 'Dock' : 'Float'}
              title={floating ? 'Dock' : 'Float'}
            >
              {floating ? <Dock size={16} /> : <Move size={16} />}
            </button>
          </div>
        </div>

        {/* Messages List with drag & drop support */}
        {open && (
        <div
          className={`chat-messages`}
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
                msg={msg}
                prevMsg={messages[index - 1]}
                userData={userData}
                allUsers={allUsers}
                openPreviewModal={openPreviewModal}
                folderKey={folderKey}
                renderFilePreview={renderFilePreview}
                getFileNameFromUrl={getFileNameFromUrl}
                onDelete={(m) => setDeleteTarget(m)}
                onEditRequest={(m) => setEditTarget(m)}
                onReact={reactToMessage}
              />
            ))
          )}
          {messages.length > 0 && <div />}
        </div>
        )}

        {/* Message Input with Drag & Drop Visual Feedback */}
       {open && (
       <div className="message-input-container">
          <input
            type="text"
            placeholder="Type a message or drag files here..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
             onKeyDown={(e) => {
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
        {isDragging && (
          <div className="drag-overlay">Drop files to upload</div>
        )}

        
      </div>

      {/* File Preview Modal */}
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
              const ext = selectedPreviewFile.fileName
                .split(".")
                .pop()
                .toLowerCase();
              if (["jpg", "jpeg", "png"].includes(ext)) {
                return (
                  <img
                    src={selectedPreviewFile.finalUrl || selectedPreviewFile.url}
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
              <button onClick={closePreviewModal} className="modal-button secondary">

                <FontAwesomeIcon icon={faTimes} />
              </button>
              <a
                href={selectedPreviewFile.url}
                download
                style={{ color: "white" }}
              >
                <FontAwesomeIcon icon={faDownload} />
              </a>
            </div>
          </div>
        )}
      </Modal>
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
      <PromptModal
        isOpen={!!editTarget}
        onRequestClose={() => setEditTarget(null)}
        onSubmit={(text) => {
          if (editTarget) editMessage(editTarget, text);
          setEditTarget(null);
        }}
        message="Edit message"
        defaultValue={editTarget?.text || ''}
        className="messages-modal-content"
        overlayClassName="messages-modal-overlay"
      />
    </>
  );
};

export default ProjectMessagesThread;
