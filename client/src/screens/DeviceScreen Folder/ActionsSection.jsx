import { Card } from "../../components/ui.jsx";

export default function ActionsSection({
  saveAndDeduct,
  deleteSelected,
  deleteAll,
  exportDevices,
}) {
  return (
    <Card title="الأجهزة والإجراءات">
      <div className="form-row" style={{ marginTop: 8 }}>
        <button className="btn btn-success" onClick={saveAndDeduct}>
          حفظ الأجهزة وخصم الرصيد
        </button>
        <button className="btn btn-danger" onClick={deleteSelected}>
          حذف المحدد
        </button>
        <button className="btn btn-danger" onClick={deleteAll}>
          حذف الكل
        </button>
        <button className="btn" onClick={exportDevices}>
          تصدير Excel
        </button>
      </div>
    </Card>
  );
}
