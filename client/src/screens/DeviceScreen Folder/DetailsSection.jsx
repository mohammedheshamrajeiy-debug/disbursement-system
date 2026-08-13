import { Card } from "../../components/ui.jsx";
import RequestDetails from "../../components/RequestDetails.jsx";

export default function DetailsSection({ request }) {
  return (
    <Card title="بيانات التفصيل">
      <RequestDetails
        request={request}
        sections={["header", "notes", "invoice", "shipment", "hand", "devices"]}
      />
    </Card>
  );
}
