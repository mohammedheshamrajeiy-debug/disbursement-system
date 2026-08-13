import { Card } from "../../components/ui.jsx";
import { DeviceEditTable, CARTON_DEV_COLS } from "./DeviceTables.jsx";
import { exportCsv } from "../../utils.js";

export default function CartonImportSection({
  cartonNo,
  setCartonNo,
  cartonSku,
  setCartonSku,
  cartonDuration,
  setCartonDuration,
  fetchCarton,
  deleteCarton,
  cartonTable,
  setCartonTable,
  cartonSel,
  setCartonSel,
  customerName,
  invoiceNumber,
  toggle,
}) {
  const rows = cartonTable.map((r) => ({
    ...r,
    customer_name: customerName,
    invoice_number: invoiceNumber,
  }));
  return (
    <Card title="الطريقة 1 — الاستيراد من الكرتونة">
      <div className="form-row">
        <div className="field">
          <label>رقم الكرتونة</label>
          <input
            value={cartonNo}
            onChange={(e) => setCartonNo(e.target.value)}
          />
        </div>
        <button className="btn" onClick={fetchCarton}>
          سحب الكرتونة
        </button>
        <button className="btn btn-danger" onClick={deleteCarton}>
          حذف الكرتون
        </button>
      </div>
      <div className="form-row">
        <div className="field">
          <label>SKU (اختياري)</label>
          <input
            value={cartonSku}
            onChange={(e) => setCartonSku(e.target.value)}
          />
        </div>
        <div className="field">
          <label>المدة (اختياري)</label>
          <input
            value={cartonDuration}
            onChange={(e) => setCartonDuration(e.target.value)}
          />
        </div>
      </div>
      <h4 style={{ marginTop: 12 }}>أجهزة الكرتونات المضافة</h4>
      <DeviceEditTable
        rows={rows}
        sel={cartonSel}
        toggleSel={(id) => toggle(cartonSel, setCartonSel, id)}
        columns={CARTON_DEV_COLS}
        onDelete={() => {
          const fresh = cartonTable.filter((r) => !cartonSel.has(r.ID));
          setCartonTable(fresh);
          setCartonSel(new Set());
        }}
        onExport={() =>
          exportCsv(
            "carton_devices.csv",
            [
              "اسم العميل",
              "رقم الفاتورة",
              "ID",
              "CartonSerialNo",
              "DecoderSerialNo",
              "ChipSerialNo",
              "CardSerialNo",
              "SKU",
              "المدة",
            ],
            rows.map((r) => [
              r.customer_name,
              r.invoice_number,
              r.ID,
              r.CartonSerialNo,
              r.DecoderSerialNo,
              r.ChipSerialNo,
              r.CardSerialNo,
              r.sku,
              r.duration,
            ]),
          )
        }
      />
    </Card>
  );
}
