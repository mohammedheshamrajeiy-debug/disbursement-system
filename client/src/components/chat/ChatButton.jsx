import { useState } from "react";
import { useTranslation } from "react-i18next";
import ChatSection from "./ChatSection.jsx";
import BroadcastComposer from "./BroadcastComposer.jsx";

export default function ChatButton({ currentTab }) {
  const { t } = useTranslation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState([]);

  // Define all available tabs
  const allTabs = [
    { id: "request", label: t("tab_request") },
    { id: "customer", label: t("tab_customer") },
    { id: "invoice", label: t("tab_invoice") },
    { id: "devices", label: t("tab_devices") },
    { id: "activation", label: t("tab_activation") },
    { id: "inventory", label: t("tab_inventory") },
    { id: "log", label: t("tab_log") }
  ];

  // Filter out current tab from chat selection
  const chatTabs = allTabs.filter(tab => tab.id !== currentTab);

  const allSelected = chatTabs.length > 0 && selectedTabs.length === chatTabs.length;

  const toggleTab = (tabId) => {
    setSelectedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((id) => id !== tabId) : [...prev, tabId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedTabs(allSelected ? [] : chatTabs.map((tab) => tab.id));
  };

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) setSelectedTabs([]);
  };

  const count = selectedTabs.length;

  return (
    <>
      {!isChatOpen ? (
        <button className="accordion-btn" onClick={handleChatToggle}>
          {t("messageWindow.chat")}
        </button>
      ) : count === 0 ? (
        <div className="chat-tab-selection">
          <div className="chat-tab-selection-header">
            <h3>{t("messageWindow.selectRecipients")}</h3>
            <button
              className="btn btn-link btn-sm p-0"
              onClick={() => setIsChatOpen(false)}
              aria-label={t("common.close")}
            >
              ×
            </button>
          </div>
          <div className="chat-select-all-row">
            <label className="chat-select-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              <span>{t("messageWindow.selectAll")}</span>
            </label>
          </div>
          <div className="chat-tab-selection-list">
            {chatTabs.map((tab) => (
              <div
                key={tab.id}
                className={`chat-tab-item ${selectedTabs.includes(tab.id) ? "active" : ""}`}
                onClick={() => toggleTab(tab.id)}
                role="checkbox"
                aria-checked={selectedTabs.includes(tab.id)}
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleTab(tab.id);
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTabs.includes(tab.id)}
                  onChange={() => toggleTab(tab.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={tab.label}
                />
                <div className="chat-tab-name">{tab.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : count === 1 ? (
        <ChatSection
          currentTab={currentTab}
          selectedChatTab={selectedTabs[0]}
          onCloseChat={() => setSelectedTabs([])}
        />
      ) : (
        <BroadcastComposer
          currentTab={currentTab}
          targets={selectedTabs}
          onDone={() => {
            setSelectedTabs([]);
            setIsChatOpen(false);
          }}
          onBack={() => setSelectedTabs([])}
        />
      )}
    </>
  );
}
