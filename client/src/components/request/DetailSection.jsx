import RequestPanel from "./RequestPanel.jsx";
import i18n from "../../i18n.jsx";

export default function DetailSection({
  source = "all",
  title = i18n.t("detailSection.title"),
  sections = ["header", "notes", "invoice", "shipment", "hand", "devices"],
  stage,
  highlight,
  onSelect,
  completed = false,
  hideFinancial = false,
}) {
  return (
    <RequestPanel
      source={source}
      stage={stage}
      title={title}
      sections={sections}
      highlight={highlight}
      onSelect={onSelect}
      completed={completed}
      hideFinancial={hideFinancial}
    />
  );
}
