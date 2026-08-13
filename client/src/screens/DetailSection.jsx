import RequestPanel from "../components/RequestPanel.jsx";

export default function DetailSection({
  source = "all",
  title = "الطلبات المحفوظة",
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
