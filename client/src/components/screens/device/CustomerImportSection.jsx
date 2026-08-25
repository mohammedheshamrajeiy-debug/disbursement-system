import { useTranslation } from "react-i18next";
import { Card } from "../../ui.jsx";
import { DeviceBrowseTable } from "./DeviceTables.jsx";
import { exportCsv } from "../../../utils.js";

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
  const { t } = useTranslation();
  const rows = filteredCust.map((r) => ({
    ...r,
    customer_name: customerName,
    invoice_number: invoiceNumber,
  }));
  return (
    <Card title={t("customerImport.title")}>
      <div className="form-row">
        <div className="field">
          <label>{t("customerImport.searchLabel")}</label>
          <input
            value={custQuery}
            onChange={(e) => setCustQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={addCustSelected}>
          {t("customerImport.addSelectedCount", { count: custSel.size })}
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
              t("customerImport.customerName"),
              t("customerImport.invoiceNumber"),
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
