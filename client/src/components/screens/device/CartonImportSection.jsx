import { useTranslation } from "react-i18next";
import { Card } from "../../ui.jsx";
import { DeviceEditTable, CARTON_DEV_COLS } from "./DeviceTables.jsx";
import { exportCsv } from "../../../utils.js";

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
  const { t } = useTranslation();
  const rows = cartonTable.map((r) => ({
    ...r,
    customer_name: customerName,
    invoice_number: invoiceNumber,
  }));
  return (
    <Card title={t("cartonImport.title")}>
      <div className="form-row">
        <div className="field">
          <label>{t("cartonImport.cartonNumber")}</label>
          <input
            value={cartonNo}
            onChange={(e) => setCartonNo(e.target.value)}
          />
        </div>
        <button className="btn" onClick={fetchCarton}>
          {t("cartonImport.fetchCarton")}
        </button>
        <button className="btn btn-danger" onClick={deleteCarton}>
          {t("cartonImport.deleteCarton")}
        </button>
      </div>
      <div className="form-row">
        <div className="field">
          <label>{t("cartonImport.skuOptional")}</label>
          <input
            value={cartonSku}
            onChange={(e) => setCartonSku(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t("cartonImport.durationOptional")}</label>
          <input
            value={cartonDuration}
            onChange={(e) => setCartonDuration(e.target.value)}
          />
        </div>
      </div>
      <h4 style={{ marginTop: 12 }}>{t("cartonImport.addedCartonDevices")}</h4>
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
              t("cartonImport.customerName"),
              t("cartonImport.invoiceNumber"),
              "ID",
              "CartonSerialNo",
              "DecoderSerialNo",
              "ChipSerialNo",
              "CardSerialNo",
              "SKU",
              t("cartonImport.duration"),
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
