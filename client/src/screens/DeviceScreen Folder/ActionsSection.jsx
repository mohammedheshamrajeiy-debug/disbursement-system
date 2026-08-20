import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui.jsx";

export default function ActionsSection({
  saveAndDeduct,
  deleteSelected,
  deleteAll,
  exportDevices,
}) {
  const { t } = useTranslation();
  return (
    <Card title={t("actionsSection.title")}>
      <div className="form-row" style={{ marginTop: 8 }}>
        <button className="btn btn-success" onClick={saveAndDeduct}>
          {t("actionsSection.saveAndDeduct")}
        </button>
        <button className="btn btn-danger" onClick={deleteSelected}>
          {t("actionsSection.deleteSelected")}
        </button>
        <button className="btn btn-danger" onClick={deleteAll}>
          {t("actionsSection.deleteAll")}
        </button>
        <button className="btn" onClick={exportDevices}>
          {t("actionsSection.exportExcel")}
        </button>
      </div>
    </Card>
  );
}
