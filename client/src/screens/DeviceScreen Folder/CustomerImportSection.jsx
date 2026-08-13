import { Card } from "../../components/ui.jsx";
import { DeviceBrowseTable } from "./DeviceTables.jsx";
import { exportCsv } from "../../utils.js";

export default function CustomerImportSection({
  custQuery,
  setCustQuery,
  addCustSelected,
  custSel,
  setCustSel,
  filteredCust,
  customerName,
  invoiceNumber,
  toggle,
}) {
  const rows = filteredCust.map((r) => ({
    ...r,
    customer_name: customerName,
    invoice_number: invoiceNumber,
  }));
  return (
    <Card title="الطريقة 2 — الاستيراد من مخزن خدمة العملاء (شرائح/ريسيفرات)">
      <div className="form-row">
        <div className="field">
          <label>بحث (شريحة / ريسيفر / بطاقة)</label>
          <input
            value={custQuery}
            onChange={(e) => setCustQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={addCustSelected}>
          إضافة المحدد ({custSel.size})
        </button>
      </div>
      <DeviceBrowseTable
        rows={rows}
        sel={custSel}
        toggleSel={(id) => toggle(custSel, setCustSel, id)}
        onExport={() =>
          exportCsv(
            "customer_storage.csv",
            [
              "اسم العميل",
              "رقم الفاتورة",
              "ID",
              "CartonSerialNo",
              "DecoderSerialNo",
              "ChipSerialNo",
              "CardSerialNo",
            ],
            rows.map((r) => [
              r.customer_name,
              r.invoice_number,
              r.ID,
              r.CartonSerialNo,
              r.DecoderSerialNo,
              r.ChipSerialNo,
              r.CardSerialNo,
            ]),
          )
        }
      />
    </Card>
  );
}
