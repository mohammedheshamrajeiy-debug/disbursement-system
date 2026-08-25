import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNotify } from "../ui.jsx";
import { getMessages, sendMessage, subscribeToMessages } from "../../services/messageService.js";

export default function ChatSidebar({ currentTab }) {
  const { t } = useTranslation();
  const notify = useNotify();
  const messagesRef = useRef([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const [isSending, setIsSending] = useState(false);

  // Keep messagesRef in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Handle tab filter change
  const handleTabChange = (e) => {
    setSelectedTab(e.target.value);
  };

  // Render tab options
  const tabOptions = [
    { value: "all", label: t("messageWindow.allTabs") },
    { value: "request", label: t("tab_request") },
    { value: "customer", label: t("tab_customer") },
    { value: "invoice", label: t("tab_invoice") },
    { value: "devices", label: t("tab_devices") },
    { value: "activation", label: t("tab_activation") },
    { value: "inventory", label: t("tab_inventory") },
    { value: "log", label: t("tab_log") }
  ];

  // Load messages for current tab
  useEffect(() => {
    const loadedMessages = selectedTab === "all"
      ? getMessages(currentTab)
      : getMessages(currentTab).filter(msg => !msg.toTab || msg.toTab === selectedTab);
    setMessages(loadedMessages);

    // Auto-scroll to bottom when new messages arrive
    const messagesEnd = document.getElementById('messages-end');
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTab, selectedTab]);

  // Subscribe to storage events for cross-tab communication
  useEffect(() => {
    const unsubscribe = subscribeToMessages(() => {
      const updatedMessages = selectedTab === "all"
        ? getMessages(currentTab)
        : getMessages(currentTab).filter(msg => !msg.toTab || msg.toTab === selectedTab);
      setMessages(updatedMessages);

      // Notify user of new message if they're not currently typing
      if (!isTyping && document.hidden) {
        notify(t("messageWindow.newMessage"), "info");
      }
    });

    return unsubscribe;
  }, [currentTab, selectedTab, isTyping, notify, t]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setIsSending(true);
    try {
      const toTab = selectedTab === "all" ? null : selectedTab;
      sendMessage(currentTab, toTab, inputValue);

      setInputValue("");
      setIsTyping(false);
      notify(t("messageWindow.messageSent"), "success");
    } catch (error) {
      notify(t("messageWindow.sendError"), "error");
    } finally {
      setIsSending(false);
    }
  };

  // Handle input change for typing indicator
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setIsTyping(value.trim().length > 0);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="chat-sidebar">
      {/* Chat Header */}
      <div className="chat-sidebar-header">
        <div className="chat-header-content">
          <div className="chat-title-wrapper">
            <h3>{t("messageWindow.title")}</h3>
          </div>
          <div className="chat-tab-selector">
            <select
              value={selectedTab}
              onChange={handleTabChange}
              className="tab-select"
              aria-label={t("messageWindow.selectTab")}
            >
              {tabOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="chat-status">
          {isTyping ? (
            <span className="typing-indicator" aria-label={t("messageWindow.typing")}>
              <span className="dot" aria-hidden="true"></span>
              <span className="dot" aria-hidden="true"></span>
              <span className="dot" aria-hidden="true"></span>
            </span>
          ) : (
            <span className="online-indicator" aria-hidden="true"></span>
          )}
          {isSending && (
            <span className="sending-indicator" aria-label={t("messageWindow.sending")}>
              ●
            </span>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="chat-sidebar-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon"></div>
            <p>{t("messageWindow.noMessages")}</p>
            <p className="chat-empty-hint">
              {t("messageWindow.startConversation")}
            </p>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`chat-message ${!msg.read ? 'unread' : ''} ${msg.fromTab === currentTab ? 'sent' : 'received'} ${msg.fromTab !== currentTab && !msg.read ? 'unread-received' : ''}`}
                onClick={() => {
                  // Mark as read when clicked
                  if (!msg.read && msg.fromTab !== currentTab) {
                    // Update message as read in storage
                    const updatedMessages = messages.map(m =>
                      m.id === msg.id ? { ...m, read: true } : m
                    );
                    setMessages(updatedMessages);

                    // Save to localStorage
                    const allMessages = getAllMessages();
                    const updatedAll = allMessages.map(m =>
                      m.id === msg.id ? { ...m, read: true } : m
                    );
                    saveAllMessages(updatedAll);

                    notify(t("messageWindow.markedAsRead"), "info");
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!msg.read && msg.fromTab !== currentTab) {
                      // Update message as read in storage
                      const updatedMessages = messages.map(m =>
                        m.id === msg.id ? { ...m, read: true } : m
                      );
                      setMessages(updatedMessages);

                      // Save to localStorage
                      const allMessages = getAllMessages();
                      const updatedAll = allMessages.map(m =>
                        m.id === msg.id ? { ...m, read: true } : m
                      );
                      saveAllMessages(updatedAll);

                      notify(t("messageWindow.markedAsRead"), "info");
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
                        : t(`tab_${msg.fromTab}`) || msg.fromTab
                      }
                    </span>
                    {!msg.read && msg.fromTab !== currentTab && (
                      <span className="chat-badge-unread" aria-label={t("messageWindow.unread")}>
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
                  {msg.fromUser && (
                    <div className="chat-message-from-user">
                      <small>{t("messageWindow.fromUser", { user: msg.fromUser })}</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div id="messages-end" aria-hidden="true"></div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-sidebar-input">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={t("messageWindow.messagePlaceholder")}
          className="chat-input"
          aria-label={t("messageWindow.messageInput")}
          autoComplete="off"
        />
        <button
          className={`btn btn-primary chat-send-btn ${isSending ? 'sending' : ''}`}
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isSending}
          aria-label={t("common.send")}
          aria-busy={isSending}
        >
          {isSending ? (
            <>
              <span className="sending-spinner" aria-hidden="true"></span>
              <span className="sending-text" aria-hidden="true">{t("common.sending")}</span>
            </>
          ) : (
            t("common.send")
          )}
        </button>
      </div>
    </div>
  );
}

// Helper functions to get/save all messages (same as in messageService.js)
function getAllMessages() {
  try {
    const stored = localStorage.getItem('app_messages');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading messages from localStorage:', error);
    return [];
  }
}

function saveAllMessages(messages) {
  try {
    localStorage.setItem('app_messages', JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages to localStorage:', error);
  }
}