import RequestPanel from "./RequestPanel.jsx";
import { useTranslation } from "react-i18next";

export default function SavedRequestsSection({
  source = "all",
  title,
  sections = ["header", "notes", "invoice", "shipment", "hand", "devices"],
  stage,
  highlight,
  onSelect,
}) {
  const { t } = useTranslation();
  const defaultTitle = t("savedRequests.title");

  return (
    <RequestPanel
      source={source}
      stage={stage}
      title={<span className="saved-requests-title">
        <span className="saved-requests-icon"></span>
        {title ?? defaultTitle}
      </span>}
      sections={sections}
      highlight={highlight}
      onSelect={onSelect}
      className="saved-requests-section"
    />
  );
}
