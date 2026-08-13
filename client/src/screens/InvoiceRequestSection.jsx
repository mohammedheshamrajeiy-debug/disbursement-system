import { Card } from "../components/ui.jsx";

export default function InvoiceRequestSection({ current }) {
  return (
    <Card title="بيانات الطلب">
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
          <span>
            المبلغ: <b>{current.amount || "—"}</b>
          </span>
          <span>
            أمر البيع: <b>{current.sale_order || "—"}</b>
          </span>
        </div>
      ) : (
        <div className="empty-hint">اختر طلباً لعرض بياناته</div>
      )}
    </Card>
  );
}
