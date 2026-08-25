import { Card } from "../../ui.jsx";
import { useTranslation } from "react-i18next";

export default function InvoiceRequestSection({ current }) {
  const { t } = useTranslation();
  return (
    <Card title={t("invoiceRequest.title")}>
      {current ? (
        <div className="info-bar">
          <span>
            {t("invoiceRequest.requestLabel")} <b>{current.req_id || current.request_id}</b>
          </span>
          <span>
            {t("invoiceRequest.nameLabel")} <b>{current.name}</b>
          </span>
          <span>
            {t("invoiceRequest.statusLabel")}{" "}
            <b>{current.display ? current.display.status : current.status}</b>
          </span>
          <span>
            {t("invoiceRequest.amountLabel")} <b>{current.amount || "—"}</b>
          </span>
          <span>
            {t("invoiceRequest.saleOrderLabel")} <b>{current.sale_order || "—"}</b>
          </span>
        </div>
      ) : (
        <div className="empty-hint">{t("invoiceRequest.emptyHint")}</div>
      )}
    </Card>
  );
}
