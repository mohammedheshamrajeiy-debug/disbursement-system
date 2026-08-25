import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ChatSection from "./ChatSection.jsx";
import BroadcastComposer from "./BroadcastComposer.jsx";

const ALL_TARGETS = [
  "disbursement",
  "customer",
  "invoice",
  "devices",
  "activation",
];

export default function useChatDrawer({ currentTab, active, onOpen, onClose }) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedChatTab, setSelectedChatTab] = useState(null);
  const [checkedChatTabs, setCheckedChatTabs] = useState([]);
  const [composing, setComposing] = useState(false);

  const chatTargets = useMemo(
    () =>
      ALL_TARGETS.filter((id) => id !== currentTab).map((id) => ({
        id,
        label: t(`tab_${id}`),
      })),
    [currentTab, t],
  );

  const allChatTargetsChecked =
    chatTargets.length > 0 && checkedChatTabs.length === chatTargets.length;

  function handleChatTargetSelect(targetId) {
    setSelectedChatTab(targetId);
    setComposing(false);
    onOpen?.();
  }

  function toggleCheckedTab(tabId) {
    setCheckedChatTabs((prev) =>
      prev.includes(tabId)
        ? prev.filter((id) => id !== tabId)
        : [...prev, tabId],
    );
  }

  function toggleAllCheckedTabs() {
    setCheckedChatTabs(
      allChatTargetsChecked ? [] : chatTargets.map((target) => target.id),
    );
  }

  function openBroadcastComposer() {
    if (checkedChatTabs.length < 2) return;
    setSelectedChatTab(null);
    setComposing(true);
    onOpen?.();
  }

  const menuItem = (
    <div key="chat" className="chat-accordion-group">
      <button
        type="button"
        className={`accordion-btn chat-accordion-btn ${
          active && !composing ? "active" : ""
        }`}
        onClick={() => setDropdownOpen((open) => !open)}
      >
        <span
          className={`chat-accordion-caret ${dropdownOpen ? "open" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
        {t("messageWindow.chat")}
      </button>
      {dropdownOpen && (
        <div className="chat-dropdown-list">
          <label className="chat-select-all chat-dropdown-item">
            <input
              type="checkbox"
              checked={allChatTargetsChecked}
              onChange={toggleAllCheckedTabs}
            />
            <span>{t("messageWindow.selectAll")}</span>
          </label>
          {chatTargets.map((target) => (
            <div
              key={target.id}
              className={`chat-dropdown-item ${
                active && !composing && selectedChatTab === target.id
                  ? "active"
                  : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => handleChatTargetSelect(target.id)}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleChatTargetSelect(target.id);
                }
              }}
            >
              <input
                type="checkbox"
                checked={checkedChatTabs.includes(target.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleCheckedTab(target.id)}
                aria-label={target.label}
              />
              <span>{target.label}</span>
            </div>
          ))}
          {checkedChatTabs.length >= 2 && (
            <button
              type="button"
              className="btn btn-primary btn-sm chat-compose-btn"
              onClick={openBroadcastComposer}
            >
              {t("messageWindow.composeToCount", {
                count: checkedChatTabs.length,
              })}
            </button>
          )}
        </div>
      )}
    </div>
  );

  const content = !active
    ? null
    : composing
      ? (
          <BroadcastComposer
            currentTab={currentTab}
            targets={checkedChatTabs}
            onBack={() => setComposing(false)}
            onDone={() => {
              setCheckedChatTabs([]);
              setComposing(false);
              onClose?.();
            }}
          />
        )
      : (
          <ChatSection
            currentTab={currentTab}
            selectedChatTab={selectedChatTab}
            onCloseChat={onClose}
          />
        );

  return { menuItem, content };
}
