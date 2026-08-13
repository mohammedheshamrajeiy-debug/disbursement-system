import RequestPanel from "./RequestPanel.jsx";

export default function SavedRequestsSection({
  source = "all",
  title = "الطلبات المحفوظة",
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
