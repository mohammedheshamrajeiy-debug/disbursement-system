import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui.jsx";
import RequestDetails from "../../components/RequestDetails.jsx";

export default function DetailsSection({ request }) {
  const { t } = useTranslation();
  return (
    <Card title={t("deviceDetails.title")}>
      <RequestDetails
        request={request}
        sections={["header", "notes", "invoice", "shipment", "hand", "devices"]}
      />
    </Card>
  );
}
