import { useState } from "react";
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
  const [devicesOpen, setDevicesOpen] = useState(false);
  const logCols = [
    { title: "الرقم", render: (r) => r.serial },
    { title: "التاريخ", render: (r) => (r.active ? r.active.date : "—") },
    {
      title: "ملاحظات",
      render: (r) => (r.active ? r.active.notes || "—" : "—"),
    },
  ];

  if (activeSection === "saved") {
    return (
      <DetailSection
        source="all"
        title="الطلبات المحفوظة"
        sections={["header", "notes", "invoice", "shipment", "hand", "devices"]}
        hideFinancial
        highlight={selectedRequest?.req_id}
        onSelect={onSavedRequestSelect}
      />
    );
  }

  if (activeSection === "return") {
    return <ReturnsPanel title="المرتجعات" />;
  }

  if (activeSection === "defect") {
    return <DefectsPanel title="العيب المصنعي" />;
  }

  return (
    <>
      <Card title="حالة وسجل الطلب">
        <div className="form-row" style={{ gap: 12, marginBottom: 14 }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label>رقم الطلب</label>
            <input
              value={reqId}
              onChange={(e) => setReqId(e.target.value)}
              placeholder="D000001"
            />
          </div>
          <button className="btn" onClick={() => setSortAsc(!sortAsc)}>
            ترتيب ({sortAsc ? "تصاعدي" : "تنازلي"})
          </button>
        </div>

        <div className="info-bar">
          <span>
            الطلب: <b>{request?.req_id || request?.request_id || "—"}</b>
          </span>
          <span>
            الاسم: <b>{request?.name || "—"}</b>
          </span>
          <span>
            الأجهزة: <b>{devices.length}</b>
          </span>
          <span>
            محمل: <b>{activated}</b>
          </span>
          <span>
            الحالة: <b>{request?.status || "—"}</b>
          </span>
        </div>

        <div className="form-row" style={{ marginTop: 8, marginBottom: 8 }}>
          <button
            type="button"
            className="btn"
            onClick={() => setDevicesOpen((v) => !v)}
          >
            أجهزة الطلب ({devices.length}) {devicesOpen ? "▴" : "▾"}
          </button>
        </div>
        {devicesOpen ? (
          <Table
            columns={deviceColumns}
            rows={deviceRows}
            rowKey={(r) => r.serial}
            emptyText="لا توجد أجهزة"
          />
        ) : null}

        <Table
          columns={logCols}
          rows={devices.filter((r) => r.active)}
          rowKey={(r) => r.serial}
          emptyText="لا يوجد تحميل بعد"
        />
        <Card title="تحميل جهاز">
          <div className="form-grid">
            <div className="field">
              <label>رقم الجهاز</label>
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
              />
            </div>
            <div className="field">
              <label>التاريخ</label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="يوم/شهر/سنة"
              />
            </div>
            <div className="field">
              <label>ملاحظات</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={activate}>
              تحميل الجهاز
            </button>
            <button className="btn btn-success" onClick={activateAll}>
              تحميل الكل
            </button>
            <button
              className="btn"
              onClick={() =>
                exportCsv(
                  "تحميل_الأجهزة.csv",
                  ["serial", "carton", "chip", "status"],
                  devices.map((r) => [
                    r.serial,
                    r.carton,
                    r.chip,
                    r.active ? "تم التحميل" : "قيد الانتظار",
                  ]),
                )
              }
            >
              تصدير الأجهزة
            </button>
            <button className="btn" onClick={loadReport}>
              تقرير التحميل
            </button>
          </div>
        </Card>
      </Card>

      {showReport && report ? (
        <Modal
          title="تقرير التحميل"
          onClose={() => setShowReport(false)}
          wide
          footer={
            <button className="btn" onClick={() => setShowReport(false)}>
              إغلاق
            </button>
          }
        >
          <div className="info-bar">
            <span>
              عدد الطلبات قيد التحميل: <b>{report.labels.length}</b>
            </span>
          </div>
          <Table
            columns={[
              { title: "الطلب", key: "req_id" },
              { title: "الاسم", key: "name" },
              { title: "الإجمالي", key: "total" },
              { title: "محمل", key: "activated" },
              { title: "متبقٍ", key: "pending" },
            ]}
            rows={report.rows}
            emptyText="لا توجد طلبات"
          />
        </Modal>
      ) : null}
    </>
  );
}
