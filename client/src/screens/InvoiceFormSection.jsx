import { Card } from "../components/ui.jsx";
import { useTranslation } from "react-i18next";

export default function InvoiceFormSection({
  current,
  reqId,
  setReqId,
  invNumber,
  setInvNumber,
  invDate,
  setInvDate,
  invAmount,
  setInvAmount,
  saleOrder,
  setSaleOrder,
  invoiceImage,
  accountantImage,
  upload,
  setView,
  save,
  navigate,
}) {
  const { t } = useTranslation();
  return (
    <Card title={t("invoiceForm.title")}>
      <div className="form-row">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>{t("invoiceForm.requestNumber")}</label>
          <input
            value={reqId}
            onChange={(e) => setReqId(e.target.value)}
            placeholder={t("invoiceForm.requestIdPlaceholder")}
          />
        </div>
      </div>
      {current ? (
        <div className="info-bar">
          <span>
            {t("invoiceForm.requestLabel")} <b>{current.req_id || current.request_id}</b>
          </span>
          <span>
            {t("invoiceForm.nameLabel")} <b>{current.name}</b>
          </span>
          <span>
            {t("invoiceForm.statusLabel")}{" "}
            <b>{current.display ? current.display.status : current.status}</b>
          </span>
        </div>
      ) : null}
      <div className="form-grid" style={{ marginTop: 12 }}>
        <div className="field">
          <label>{t("invoiceForm.invoiceNumber")}</label>
          <input
            value={invNumber}
            onChange={(e) => setInvNumber(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t("invoiceForm.invoiceDate")}</label>
          <input
            value={invDate}
            onChange={(e) => setInvDate(e.target.value)}
            placeholder={t("invoiceForm.datePlaceholder")}
          />
        </div>
        <div className="field">
          <label>{t("invoiceForm.saleOrder")}</label>
          <input
            value={saleOrder}
            onChange={(e) => setSaleOrder(e.target.value)}
          />
        </div>
      </div>

      <h4 style={{ marginTop: 16 }}>{t("invoiceForm.attachments")}</h4>
      <div className="form-grid">
        <div className="field">
          <label>{t("invoiceForm.saleOrderImage")}</label>
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
          <label>{t("invoiceForm.accountantInvoiceImage")}</label>
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

      <div className="form-row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={save}>
          {t("invoiceForm.saveInvoice")}
        </button>
        <button
          className="btn"
          onClick={() => reqId && navigate("devices", reqId)}
        >
          {t("invoiceForm.goToDevices")}
        </button>
      </div>
    </Card>
  );
}
