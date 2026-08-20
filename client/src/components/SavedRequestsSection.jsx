import RequestPanel from "./RequestPanel.jsx";
import i18n from "../i18n.jsx";

export default function SavedRequestsSection({
  source = "all",
  title = i18n.t("savedRequests.title"),
  sections = ["header", "notes", "invoice", "shipment", "hand", "devices"],
  stage,
  highlight,
  onSelect,
}) {
  return (
    <RequestPanel
      source={source}
      stage={stage}
      title={title}
      sections={sections}
      highlight={highlight}
      onSelect={onSelect}
    />
  );
}
