import React, { useState, useMemo, useRef } from "react";
import User from "../../../../assets/svg/user.svg?react";
import { useOnlineStatus } from "../../../../app/contexts/OnlineStatusContext";
import { Trash2, Pencil, Smile } from "lucide-react";
import ReactPlayer from "react-player";
import '../../../../index.css';
import { S3_PUBLIC_BASE } from '../../../../utils/api';
import ReactionBar from '../../../../components/ReactionBar';

const MessageItem = ({
  msg,
  prevMsg,
  userData,
  allUsers,
  openPreviewModal,
  folderKey,
  renderFilePreview,
  getFileNameFromUrl,
  onDelete,
  onEditRequest,
  onReact,
}) => {
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
      if (users.includes(userData?.userId)) arr.push(emoji);
    });
    return arr;
  }, [msg.reactions, userData?.userId]);

  const urlRegex = /(https?:\/\/[^\s]+)/;

   const RenderLinkContent = ({ url }) => {
    

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
    } catch (e) {
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
            style={{ width: "16px", height: "16px", marginRight: "4px" }}
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
    () =>
      Object.values(msg.reactions || {}).some(
        (users) => Array.isArray(users) && users.length > 0
      ),
    [msg.reactions]
  );

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
    if (formattedDate !== prevDate) showDateBubble = true;
  }

  return (
    <React.Fragment>
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
        
        <div className="bubble-container" style={{ position: 'relative' }}>
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
          <div style={{ marginBottom: "5px" }}>
            {msg.file ? (
              <div onClick={() => openPreviewModal(msg.file)} style={{ cursor: "pointer" }}>
                {renderFilePreview(msg.file, folderKey)}
              </div>
            ) : msg.text && msg.text.includes(S3_PUBLIC_BASE) ? (
              <div
                onClick={() =>
                  openPreviewModal({
                    fileName: getFileNameFromUrl(msg.text),
                    url: msg.text,
                  })
                }
                style={{ cursor: "pointer" }}
              >
                {renderFilePreview(
                  { fileName: getFileNameFromUrl(msg.text), url: msg.text },
                  folderKey
                )}
              </div>
               ) : urlRegex.test(msg.text) ? (
              <RenderLinkContent url={msg.text.match(urlRegex)[0]} />
            ) : (
              msg.text
            )}
          </div>
          {hasReactions && (
            <div className="reaction-summary">
              {Object.entries(msg.reactions || {}).map(([emoji, users]) =>
                users.length > 0 ? (
                  <span
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className={userReactions.includes(emoji) ? 'selected' : ''}
                    >
                      {emoji} {users.length}
                    </span>
                ) : null
              )}
            </div>
          )}
            <div className="action-bar">
              {isCurrentUser && (
                <>
                  <button
                    className="action-btn"
                    onClick={() => onEditRequest && onEditRequest(msg)}
                    aria-label="Edit message"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => onDelete && onDelete(msg)}
                    aria-label="Delete message"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
              <button
                className="action-btn"
                onClick={() => setShowReactions((p) => !p)}
                aria-label="Add reaction"
              >
                <Smile size={12} />
              </button>
            </div>
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
    </React.Fragment>
  );
};

export default MessageItem;