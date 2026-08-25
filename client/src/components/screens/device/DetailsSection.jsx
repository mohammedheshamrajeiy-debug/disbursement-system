import { useTranslation } from "react-i18next";
import { Card } from "../../ui.jsx";
import RequestDetails from "../../request/RequestDetails.jsx";

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
