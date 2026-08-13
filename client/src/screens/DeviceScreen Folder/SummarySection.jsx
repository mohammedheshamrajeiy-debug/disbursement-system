import { Card } from "../../components/ui.jsx";
import RequestDetails from "../../components/RequestDetails.jsx";

const STORAGES = [
  { id: "storage_1", label: "المخزون 1" },
  { id: "storage_2", label: "المخزون 2" },
  { id: "storage_return", label: "مخزن المرتجع" },
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
  return (
    <Card title="معلومات الطلب">
      <div className="form-row">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>رقم الطلب</label>
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
              {s.label}
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
            الطلب: <b>{request.req_id || request.request_id}</b>
          </span>
          <span>
            الاسم: <b>{request.name}</b>
          </span>
          <span>
            الحالة: <b>{request.status}</b>
          </span>
          <span>
            الأجهزة المحفوظة: <b>{currentDevices.length}</b>
          </span>
          <span>
            الرصيد:{" "}
            <b>{request.financial_deducted ? "تم الخصم" : "لم يُخصم"}</b>
          </span>
        </div>
      ) : (
        <div className="empty-hint">اختر طلباً لعرض معلوماته</div>
      )}
      {request ? (
        <RequestDetails
          request={request}
          sections={["header", "notes", "invoice", "devices"]}
        />
      ) : null}
      <div className="form-row" style={{ marginTop: 14 }}>
        <button
          className={`btn ${importPanel === "carton" ? "btn-primary" : ""}`}
          type="button"
          onClick={onToggleCarton}
        >
          استيراد من الكرتونة
        </button>
        <button
          className={`btn ${importPanel === "customer" ? "btn-primary" : ""}`}
          type="button"
          onClick={onToggleCustomer}
        >
          استيراد من المخزن
        </button>
      </div>
    </Card>
  );
}

export { STORAGES };
