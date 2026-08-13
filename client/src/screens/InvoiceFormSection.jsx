import { Card } from "../components/ui.jsx";

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
  save,
  navigate,
}) {
  return (
    <Card title="إدخال بيانات الفاتورة">
      <div className="form-row">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>رقم الطلب</label>
          <input
            value={reqId}
            onChange={(e) => setReqId(e.target.value)}
            placeholder="D000001 أو C00001"
          />
        </div>
      </div>
      {current ? (
        <div className="info-bar">
          <span>
            الطلب: <b>{current.req_id || current.request_id}</b>
          </span>
          <span>
            الاسم: <b>{current.name}</b>
          </span>
          <span>
            الحالة:{" "}
            <b>{current.display ? current.display.status : current.status}</b>
          </span>
        </div>
      ) : null}
      <div className="form-grid" style={{ marginTop: 12 }}>
        <div className="field">
          <label>رقم الفاتورة</label>
          <input
            value={invNumber}
            onChange={(e) => setInvNumber(e.target.value)}
          />
        </div>
        <div className="field">
          <label>تاريخ الفاتورة</label>
          <input
            value={invDate}
            onChange={(e) => setInvDate(e.target.value)}
            placeholder="يوم/شهر/سنة"
          />
        </div>
        <div className="field">
          <label>أمر البيع</label>
          <input
            value={saleOrder}
            onChange={(e) => setSaleOrder(e.target.value)}
          />
        </div>
      </div>
      <div className="form-row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={save}>
          حفظ الفاتورة
        </button>
        <button
          className="btn"
          onClick={() => reqId && navigate("devices", reqId)}
        >
          الانتقال إلى الأجهزة
        </button>
      </div>
    </Card>
  );
}
