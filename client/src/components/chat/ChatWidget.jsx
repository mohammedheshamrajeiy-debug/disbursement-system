import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui.jsx";
import ChatSection from "./ChatSection.jsx";

// Chat as a modal, opened/closed entirely by the parent (via `open`/`onClose`).
// Unlike the old ChatButton, this renders no trigger button of its own —
// the sidebar button that opens it lives in RequestFormScreen.
export default function ChatWidget({ currentTab, open, onClose }) {
  const { t } = useTranslation();
  const [selectedChatTab, setSelectedChatTab] = useState(null);

  const allTabs = [
    { id: "request", label: t("tab_request") },
    { id: "customer", label: t("tab_customer") },
    { id: "invoice", label: t("tab_invoice") },
    { id: "devices", label: t("tab_devices") },
    { id: "activation", label: t("tab_activation") },
    { id: "inventory", label: t("tab_inventory") },
    { id: "log", label: t("tab_log") },
  ];

  const chatTabs = allTabs.filter((tab) => tab.id !== currentTab);

  const handleClose = () => {
    setSelectedChatTab(null);
    onClose();
  };

  const handleTabSelect = (tabId) => {
    setSelectedChatTab(tabId);
  };

  if (!open) return null;

  return (
    <Modal
      title={
        selectedChatTab
          ? allTabs.find((tab) => tab.id === selectedChatTab)?.label || selectedChatTab
          : t("messageWindow.selectChat")
      }
      onClose={handleClose}
      wide
    >
      {selectedChatTab ? (
        <ChatSection
          currentTab={currentTab}
          selectedChatTab={selectedChatTab}
          onCloseChat={() => setSelectedChatTab(null)}
        />
      ) : (
        <div className="chat-tab-list">
          {chatTabs.map((tab) => (
            <div
              key={tab.id}
              className="chat-tab-item"
              onClick={() => handleTabSelect(tab.id)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTabSelect(tab.id);
                }
              }}
            >
              <div className="chat-tab-name">{tab.label}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
