import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNotify } from "../ui.jsx";
import { uploadImages } from "../../api.js";
import { getMessages, sendMessage, markAsRead } from "../../services/messageService.js";
import { onMessageNew } from "../../services/socketService.js";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

export default function ChatSection({ currentTab, selectedChatTab, onCloseChat }) {
  const { t } = useTranslation();
  const notify = useNotify();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Load messages for current conversation
  useEffect(() => {
    let cancelled = false;
    getMessages(currentTab, selectedChatTab)
      .then((loaded) => {
        if (!cancelled) {
          setMessages(loaded);
          scrollToBottom();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentTab, selectedChatTab]);

  // Listen for new messages in real time
  useEffect(() => {
    const unsubscribe = onMessageNew(async (message) => {
      const relevant =
        message &&
        ((message.fromTab === currentTab && message.toTab === selectedChatTab) ||
          (message.fromTab === selectedChatTab && message.toTab === currentTab));
      if (!relevant) return;
      const updated = await getMessages(currentTab, selectedChatTab);
      setMessages((prev) => {
        const prevIds = new Set(prev.map((m) => m.id));
        return updated.some((m) => !prevIds.has(m.id)) ? updated : prev;
      });
    });
    return unsubscribe;
  }, [currentTab, selectedChatTab]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim() && !attachment) return;

    setIsSending(true);
    try {
      await sendMessage(currentTab, selectedChatTab, inputValue, "", attachment);

      setInputValue("");
      setAttachment("");
      setAttachmentName("");
      // Immediately refresh so the sent message appears
      const updated = await getMessages(currentTab, selectedChatTab);
      setMessages(updated);
      notify(t("messageWindow.messageSent"), "success");
    } catch (error) {
      notify(error.message || t("messageWindow.sendError"), "error");
    } finally {
      setIsSending(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file attachment selection
  const handleAttachChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const data = await uploadImages([file]);
      if (data.urls?.length) {
        setAttachment(data.urls[0]);
        setAttachmentName(file.name);
      }
    } catch (error) {
      notify(error.message || t("messageWindow.sendError"), "error");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  // Mark a received message as read
  const handleMarkAsRead = async (msgId) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, read: true } : m))
    );
    try {
      await markAsRead(msgId);
      notify(t("messageWindow.markedAsRead"), "info");
    } catch {
      // keep optimistic state even if the server call fails
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!selectedChatTab) {
    return null;
  }

  const otherTabLabel = t(`tab_${selectedChatTab}`, selectedChatTab);

  return (
    <div className="chat-section">
      {/* Chat Header */}
      <div className="chat-section-header">
        <h3>{t("messageWindow.title")}</h3>
        <div className="chat-partner">
          {t("messageWindow.chattingWith")}: <strong>{otherTabLabel}</strong>
        </div>
      </div>

      {/* Messages List */}
      <div className="chat-section-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon"></div>
            <p>{t("messageWindow.noMessages")}</p>
            <p className="chat-empty-hint">
              {t("messageWindow.startConversation", { user: otherTabLabel })}
            </p>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((msg) => (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`chat-message ${!msg.read ? "unread" : ""} ${
                  msg.fromTab === currentTab ? "sent" : "received"
                } ${msg.fromTab !== currentTab && !msg.read ? "unread-received" : ""}`}
                onClick={() => {
                  if (!msg.read && msg.fromTab !== currentTab) {
                    handleMarkAsRead(msg.id);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!msg.read && msg.fromTab !== currentTab) {
                      handleMarkAsRead(msg.id);
                    }
                  }
                }}
                tabIndex={0}
              >
                <div className="chat-message-header">
                  <div className="chat-message-from-wrapper">
                    <span className="chat-message-from">
                      {msg.fromTab === currentTab
                        ? t("messageWindow.you")
                        : t(`tab_${msg.fromTab}`, msg.fromTab)}
                    </span>
                    {!msg.read && msg.fromTab !== currentTab && (
                      <span
                        className="chat-badge-unread"
                        aria-label={t("messageWindow.unread")}
                      >
                        ●
                      </span>
                    )}
                  </div>
                  <span className="chat-message-time" aria-hidden="true">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div className="chat-message-content">
                  {msg.content}
                  {msg.attachment && (
                    <div className="chat-message-attachment">
                      {IMAGE_RE.test(msg.attachment) ? (
                        <a href={msg.attachment} target="_blank" rel="noreferrer">
                          <img
                            src={msg.attachment}
                            alt={t("messageWindow.attachment")}
                            className="chat-attachment-image"
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.attachment}
                          target="_blank"
                          rel="noreferrer"
                          className="chat-attachment-link"
                        >
                          {t("messageWindow.attachment")}
                        </a>
                      )}
                    </div>
                  )}
                  {msg.fromUser && (
                    <div className="chat-message-from-user">
                      <small>
                        {t("messageWindow.fromUser", { user: msg.fromUser })}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} aria-hidden="true"></div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-section-input">
        {attachment && (
          <div className="chat-attachment-chip">
            <span className="chat-attachment-chip-name">{attachmentName}</span>
            <button
              type="button"
              className="chat-attachment-chip-remove"
              onClick={() => {
                setAttachment("");
                setAttachmentName("");
              }}
              aria-label={t("common.close")}
            >
              ×
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleAttachChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        />
        <textarea
          rows={4}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={t("messageWindow.messagePlaceholder")}
          className="chat-input chat-textarea"
          aria-label={t("messageWindow.messageInput")}
          autoComplete="off"
          disabled={isSending}
        />
        <div className="chat-input-actions">
          <button
            className={`btn btn-primary chat-send-btn ${isSending ? "sending" : ""}`}
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !attachment) || isSending}
            aria-label={t("messageWindow.send")}
            aria-busy={isSending}
          >
            {isSending ? (
              <>
                <span className="sending-spinner" aria-hidden="true"></span>
                <span className="sending-text" aria-hidden="true">
                  {t("messageWindow.sending")}
                </span>
              </>
            ) : (
              t("messageWindow.send")
            )}
          </button>
          <button
            type="button"
            className="btn chat-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || isSending}
            aria-label={t("messageWindow.attach")}
            title={t("messageWindow.attach")}
          >
            {uploadingFile ? "…" : "📎"}
          </button>
        </div>
      </div>
    </div>
  );
}
