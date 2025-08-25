import React, { useMemo, useRef, useState } from "react";
import User from "@/assets/svg/user.svg?react";
import { useOnlineStatus } from "@/app/contexts/OnlineStatusContext";
import { Trash2, Pencil, Smile } from "lucide-react";
import ReactPlayer from "react-player";
import "@/index.css";
import { S3_PUBLIC_BASE } from "@/utils/api";
import ReactionBar from "@/components/ReactionBar";

type Emoji = string;

export interface ChatFile {
  fileName?: string;
  url: string;
  [k: string]: any;
}

export interface ChatMessage {
  messageId?: string;
  optimisticId?: string;
  senderId: string;
  timestamp: number | string | Date;
  text?: string;
  file?: ChatFile | null;
  reactions?: Record<Emoji, string[]>; // emoji -> userId[]
}

export interface SimpleUser {
  userId?: string;
  firstName?: string;
  thumbnail?: string;
}

interface MessageItemProps {
  msg: ChatMessage;
  prevMsg?: ChatMessage | null;
  userData?: SimpleUser | null;
  allUsers?: SimpleUser[];
  openPreviewModal: (file: ChatFile) => void;
  folderKey: string;
  renderFilePreview: (file: ChatFile, folderKey: string) => React.ReactNode;
  getFileNameFromUrl: (url: string) => string;
  onDelete?: (msg: ChatMessage) => void;
  onEditRequest?: (msg: ChatMessage) => void;
  onReact?: (messageId: string, emoji: Emoji) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  msg,
  prevMsg,
  userData,
  allUsers = [],
  openPreviewModal,
  folderKey,
  renderFilePreview,
  getFileNameFromUrl,
  onDelete,
  onEditRequest,
  onReact,
}) => {
  const { onlineUsers } = useOnlineStatus() as { onlineUsers: string[] };
  const isCurrentUser = msg.senderId === (userData?.userId ?? "");
  const sender = allUsers.find((u) => u.userId === msg.senderId) || ({} as SimpleUser);
  const senderName = isCurrentUser
    ? userData?.firstName || "You"
    : sender.firstName || "Unknown";
  const senderThumbnail = isCurrentUser ? userData?.thumbnail : sender.thumbnail;
  const isSenderOnline = onlineUsers?.includes?.(msg.senderId) ?? false;

  const [showReactions, setShowReactions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const userReactions = useMemo<Emoji[]>(() => {
    const arr: Emoji[] = [];
    const reactions = msg.reactions || {};
    Object.entries(reactions).forEach(([emoji, users]) => {
      if (users.includes(userData?.userId ?? "")) arr.push(emoji);
    });
    return arr;
  }, [msg.reactions, userData?.userId]);

  const text = msg.text ?? "";
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const matchedUrl = text.match(urlRegex)?.[0];

  const RenderLinkContent: React.FC<{ url: string }> = ({ url }) => {
    if (/youtu\.be|youtube\.com|vimeo\.com/.test(url)) {
      return (
        <div style={{ maxWidth: "300px" }}>
          <ReactPlayer url={url} width="100%" height="200px" controls />
        </div>
      );
    }
    let domain = "";
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = "";
    }
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;
    return (
      <div style={{ maxWidth: "300px" }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#4ea1f3", display: "flex", alignItems: "center" }}
        >
          <img
            src={faviconUrl}
            alt=""
            style={{ width: 16, height: 16, marginRight: 4 }}
          />
          {url}
        </a>
      </div>
    );
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

  const hasReactions = useMemo(
    () => Object.values(msg.reactions || {}).some((users) => Array.isArray(users) && users.length > 0),
    [msg.reactions]
  );

  const handleEmojiClick = (emoji: Emoji) => {
    const id = msg.messageId || msg.optimisticId;
    if (id && onReact) onReact(id, emoji);
    setShowReactions(false);
  };

  // date bubble logic
  let showDateBubble = !prevMsg;
  if (prevMsg) {
    const prevDate = new Date(prevMsg.timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    if (formattedDate !== prevDate) showDateBubble = true;
  }

  // helper to render file/text/url
  const renderBody = () => {
    if (msg.file) {
      return (
        <div onClick={() => openPreviewModal(msg.file!)} style={{ cursor: "pointer" }}>
          {renderFilePreview(msg.file!, folderKey)}
        </div>
      );
    }
    if (text && text.includes(S3_PUBLIC_BASE)) {
      const file: ChatFile = { fileName: getFileNameFromUrl(text), url: text };
      return (
        <div
          onClick={() => openPreviewModal(file)}
          style={{ cursor: "pointer" }}
        >
          {renderFilePreview(file, folderKey)}
        </div>
      );
    }
    if (matchedUrl) {
      return <RenderLinkContent url={matchedUrl} />;
    }
    return text;
  };

  return (
    <>
      {showDateBubble && <div className="date-bubble">{formattedDate}</div>}

      <div className={`message-row ${isCurrentUser ? "current-user" : ""}`}>
        {!isCurrentUser && (
          <div className="avatar-wrapper">
            {senderThumbnail ? (
              <img src={senderThumbnail} alt={senderName} className="avatar" />
            ) : (
              <User className="avatar" />
            )}
            {isSenderOnline && <span className="online-indicator" />}
          </div>
        )}

        <div className="bubble-container" style={{ position: "relative" }}>
          <div
            className="message-bubble"
            style={{ background: isCurrentUser ? "#FA3356" : "#333" }}
            ref={bubbleRef}
            tabIndex={0}
          >
            <ReactionBar
              visible={showReactions}
              anchorRef={bubbleRef}
              selected={userReactions}
              onSelect={handleEmojiClick}
              onClose={() => setShowReactions(false)}
            />
            <div className="message-time">{formattedTime}</div>
            <div className="message-sender">{senderName}</div>

            <div style={{ marginBottom: 5 }}>{renderBody()}</div>

            {hasReactions && (
              <div className="reaction-summary">
                {Object.entries(msg.reactions || {}).map(([emoji, users]) =>
                  users.length > 0 ? (
                    <span
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className={userReactions.includes(emoji) ? "selected" : ""}
                    >
                      {emoji} {users.length}
                    </span>
                  ) : null
                )}
              </div>
            )}
          </div>

          <div className="action-bar">
            {isCurrentUser && (
              <>
                <button
                  className="action-btn"
                  onClick={() => onEditRequest?.(msg)}
                  aria-label="Edit message"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => onDelete?.(msg)}
                  aria-label="Delete message"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
            <button
              className="action-btn"
              onClick={() => setShowReactions((p) => !p)}
              aria-label="Add reaction"
              title="React"
            >
              <Smile size={12} />
            </button>
          </div>
        </div>

        {isCurrentUser && (
          <div className="avatar-wrapper">
            {senderThumbnail ? (
              <img src={senderThumbnail} alt="You" className="avatar avatar-right" />
            ) : (
              <User className="avatar avatar-right" />
            )}
            {isSenderOnline && <span className="online-indicator" />}
          </div>
        )}
      </div>
    </>
  );
};

export default MessageItem;
