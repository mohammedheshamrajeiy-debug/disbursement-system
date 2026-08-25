import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNotify } from "../ui.jsx";
import { sendMessageToTabs } from "../../services/messageService.js";

export default function BroadcastComposer({ currentTab, targets, onDone, onBack }) {
  const { t } = useTranslation();
  const notify = useNotify();
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const labels = targets.map((id) => t(`tab_${id}`, id));

  const handleSend = async () => {
    if (!value.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessageToTabs(currentTab, targets, value);
      notify(t("messageWindow.messageSentTo", { count: targets.length }), "success");
      setValue("");
      onDone();
    } catch (error) {
      notify(error.message || t("messageWindow.sendError"), "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-section broadcast-composer">
      <div className="chat-section-header">
        {onBack && (
          <button
            className="btn btn-link btn-sm p-0"
            onClick={onBack}
            aria-label={t("common.back")}
          >
            ←
          </button>
        )}
        <h3>{t("messageWindow.composeTo")}</h3>
        {onDone && (
          <button
            className="btn btn-link btn-sm p-0"
            onClick={onDone}
            aria-label={t("common.close")}
          >
            ×
          </button>
        )}
        <div className="chat-partner">
          {labels.join(", ")} ({targets.length})
        </div>
      </div>
      <div className="broadcast-body">
        <textarea
          className="chat-input broadcast-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t("messageWindow.broadcastPlaceholder")}
          rows={4}
          autoFocus
          disabled={isSending}
          aria-label={t("messageWindow.messageInput")}
        />
        <button
          className="btn btn-primary chat-send-btn"
          onClick={handleSend}
          disabled={!value.trim() || isSending}
          aria-busy={isSending}
        >
          {isSending ? t("messageWindow.sending") : t("messageWindow.send")}
        </button>
      </div>
    </div>
  );
}
