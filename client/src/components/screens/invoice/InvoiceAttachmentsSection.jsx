import { Card } from "../../ui.jsx";
import { useTranslation } from "react-i18next";

export default function InvoiceAttachmentsSection({
  invoiceImage,
  accountantImage,
  upload,
  setView,
}) {
  const { t } = useTranslation();
  return (
    <Card title={t("invoiceAttachments.title")}>
      <div className="form-grid">
        <div className="field">
          <label>{t("invoiceAttachments.saleOrderImage")}</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => upload(e.target.files, "invoice")}
          />
          {invoiceImage ? (
            <div className="img-thumbs">
              <img
                className="img-thumb"
                src={invoiceImage}
                onClick={() => setView([invoiceImage])}
                alt=""
              />
            </div>
          ) : null}
        </div>
        <div className="field">
          <label>{t("invoiceAttachments.accountantInvoiceImage")}</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => upload(e.target.files, "accountant")}
          />
          {accountantImage ? (
            <div className="img-thumbs">
              <img
                className="img-thumb"
                src={accountantImage}
                onClick={() => setView([accountantImage])}
                alt=""
              />
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
