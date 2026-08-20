import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui.jsx";
import RequestDetails from "../../components/RequestDetails.jsx";

const STORAGES = [
  { id: "storage_1", label: "storage.storage_1" },
  { id: "storage_2", label: "storage.storage_2" },
  { id: "storage_return", label: "storage.storage_return" },
];

export default function SummarySection({
  reqId,
  setReqId,
  storageId,
  setStorageId,
  countsFor,
  request,
  currentDevices,
  importPanel,
  onToggleCarton,
  onToggleCustomer,
}) {
  const { t } = useTranslation();
  return (
    <Card title={t("summarySection.title")}>
      <div className="form-row">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>{t("summarySection.requestNumber")}</label>
          <input
            value={reqId}
            onChange={(e) => setReqId(e.target.value)}
            placeholder="D000001"
          />
        </div>
        <div className="radio-row">
          {STORAGES.map((s) => (
            <label key={s.id}>
              <input
                type="radio"
                name="storage"
                checked={storageId === s.id}
                onChange={() => setStorageId(s.id)}
              />
              {t(s.label)}
            </label>
          ))}
          {countsFor[storageId] != null ? (
            <b>({countsFor[storageId]})</b>
          ) : null}
        </div>
      </div>
      {request ? (
        <div className="info-bar" style={{ marginTop: 10 }}>
          <span>
            {t("summarySection.request")}:{" "}
            <b>{request.req_id || request.request_id}</b>
          </span>
          <span>
            {t("summarySection.name")}: <b>{request.name}</b>
          </span>
          <span>
            {t("summarySection.status")}: <b>{request.status}</b>
          </span>
          <span>
            {t("summarySection.savedDevices")}:{" "}
            <b>{currentDevices.length}</b>
          </span>
          <span>
            {t("summarySection.balance")}:{" "}
            <b>
              {request.financial_deducted
                ? t("summarySection.deducted")
                : t("summarySection.notDeducted")}
            </b>
          </span>
        </div>
      ) : (
        <div className="empty-hint">{t("summarySection.selectRequestHint")}</div>
      )}
      {request ? (
        <RequestDetails
          request={request}
          sections={["header", "notes", "invoice", "devices"]}
        />
      ) : null}
      <div className="field">
        <label>{t("summarySection.importHeader")}</label>
      </div>
      <div className="form-row" style={{ marginTop: 14 }}>
        <button
          className={`btn ${importPanel === "carton" ? "btn-primary" : ""}`}
          type="button"
          onClick={onToggleCarton}
        >
          {t("summarySection.importFromCarton")}
        </button>
        <button
          className={`btn ${importPanel === "customer" ? "btn-primary" : ""}`}
          type="button"
          onClick={onToggleCustomer}
        >
          {t("summarySection.importFromStorage")}
        </button>
      </div>
    </Card>
  );
}

export { STORAGES };
