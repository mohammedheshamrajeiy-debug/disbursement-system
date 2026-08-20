import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Table, Modal } from "../components/ui.jsx";
import DetailSection from "./DetailSection.jsx";
import ReturnsPanel from "../components/ReturnsPanel.jsx";
import DefectsPanel from "../components/DefectsPanel.jsx";
import { exportCsv } from "../utils.js";

export default function ActivationSection({
  activeSection,
  selectedRequest,
  onSavedRequestSelect,

  reqId,
  setReqId,
  request,
  devices,
  deviceRows,
  deviceColumns,
  activated,
  sortAsc,
  setSortAsc,

  serial,
  setSerial,
  date,
  setDate,
  notes,
  setNotes,

  activate,
  activateAll,
  loadReport,

  showReport,
  setShowReport,
  report,
}) {
  const { t } = useTranslation();
  const [devicesOpen, setDevicesOpen] = useState(false);
  const logCols = [
    { title: t("activationSection.number"), render: (r) => r.serial },
    {
      title: t("activationSection.date"),
      render: (r) => (r.active ? r.active.date : "—"),
    },
    {
      title: t("activationSection.notes"),
      render: (r) => (r.active ? r.active.notes || "—" : "—"),
    },
  ];

  if (activeSection === "saved") {
    return (
      <DetailSection
        source="all"
        title={t("activationSection.savedRequests")}
        sections={["header", "notes", "invoice", "shipment", "hand", "devices"]}
        hideFinancial
        highlight={selectedRequest?.req_id}
        onSelect={onSavedRequestSelect}
      />
    );
  }

  if (activeSection === "return") {
    return <ReturnsPanel title={t("activationSection.returns")} />;
  }

  if (activeSection === "defect") {
    return <DefectsPanel title={t("activationSection.defect")} />;
  }

  return (
    <>
      <Card title={t("activationSection.statusAndLog")}>
        <div className="form-row" style={{ gap: 12, marginBottom: 14 }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label>{t("activationSection.requestNumber")}</label>
            <input
              value={reqId}
              onChange={(e) => setReqId(e.target.value)}
              placeholder="D000001"
            />
          </div>
          <button className="btn" onClick={() => setSortAsc(!sortAsc)}>
            {t("activationSection.order")} (
            {sortAsc ? t("activationSection.ascending") : t("activationSection.descending")})
          </button>
        </div>

        <div className="info-bar">
          <span>
            {t("activationSection.requestLabel")}{" "}
            <b>{request?.req_id || request?.request_id || "—"}</b>
          </span>
          <span>
            {t("activationSection.nameLabel")} <b>{request?.name || "—"}</b>
          </span>
          <span>
            {t("activationSection.devicesLabel")} <b>{devices.length}</b>
          </span>
          <span>
            {t("activationSection.loadedLabel")} <b>{activated}</b>
          </span>
          <span>
            {t("activationSection.statusLabel")}{" "}
            <b>{request?.status || "—"}</b>
          </span>
        </div>

        <div className="form-row" style={{ marginTop: 8, marginBottom: 8 }}>
          <button
            type="button"
            className="btn"
            onClick={() => setDevicesOpen((v) => !v)}
          >
            {t("activationSection.orderDevices", { count: devices.length })}{" "}
            {devicesOpen ? "▴" : "▾"}
          </button>
        </div>
        {devicesOpen ? (
          <Table
            columns={deviceColumns}
            rows={deviceRows}
            rowKey={(r) => r.serial}
            emptyText={t("activationSection.noDevices")}
          />
        ) : null}

        <Table
          columns={logCols}
          rows={devices.filter((r) => r.active)}
          rowKey={(r) => r.serial}
          emptyText={t("activationSection.noActivationsYet")}
        />
        <Card title={t("activationSection.loadDevice")}>
          <div className="form-grid">
            <div className="field">
              <label>{t("activationSection.deviceNumber")}</label>
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("activationSection.date")}</label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder={t("activationSection.dayMonthYear")}
              />
            </div>
            <div className="field">
              <label>{t("activationSection.notes")}</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={activate}>
              {t("activationSection.loadDeviceAction")}
            </button>
            <button className="btn btn-success" onClick={activateAll}>
              {t("activationSection.loadAll")}
            </button>
            <button
              className="btn"
              onClick={() =>
                exportCsv(
                  t("activationSection.csvFileName"),
                  ["serial", "carton", "chip", "status"],
                  devices.map((r) => [
                    r.serial,
                    r.carton,
                    r.chip,
                    r.active ? t("status.activated") : t("status.pending"),
                  ]),
                )
              }
            >
              {t("activationSection.exportDevices")}
            </button>
            <button className="btn" onClick={loadReport}>
              {t("activationSection.activationReport")}
            </button>
          </div>
        </Card>
      </Card>

      {showReport && report ? (
        <Modal
          title={t("activationSection.activationReport")}
          onClose={() => setShowReport(false)}
          wide
          footer={
            <button className="btn" onClick={() => setShowReport(false)}>
              {t("common.close")}
            </button>
          }
        >
          <div className="info-bar">
            <span>
              {t("activationSection.pendingRequestsCount")}{" "}
              <b>{report.labels.length}</b>
            </span>
          </div>
          <Table
            columns={[
              { title: t("activationSection.request"), key: "req_id" },
              { title: t("activationSection.name"), key: "name" },
              { title: t("activationSection.total"), key: "total" },
              { title: t("activationSection.loaded"), key: "activated" },
              { title: t("activationSection.remaining"), key: "pending" },
            ]}
            rows={report.rows}
            emptyText={t("activationSection.noRequests")}
          />
        </Modal>
      ) : null}
    </>
  );
}
