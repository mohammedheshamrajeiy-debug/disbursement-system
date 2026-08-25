import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../../api.js";
import { useNotify } from "../../ui.jsx";
import RequestPanel from "../../request/RequestPanel.jsx";
import ActivationSection from "./ActivationSection.jsx";
import { useNav } from "../../../App.jsx";
import useChatDrawer from "../../chat/useChatDrawer.jsx";

export default function ActivationScreen() {
  const notify = useNotify();
  const { t } = useTranslation();
  const { selectedRequest, setSelectedRequest } = useNav();

  const [reqId, setReqId] = useState("");
  const [request, setRequest] = useState(null);
  const [serial, setSerial] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [activeSection, setActiveSection] = useState("status");
  const [selectedSerial, setSelectedSerial] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const drawerItems = [
    { key: "status", label: t("activationScreen.statusAndLog") },
    { key: "saved", label: t("activationScreen.savedRequests") },
    { key: "return", label: t("activationScreen.returns") },
    { key: "defect", label: t("activationScreen.defect") },
    { key: "chat", label: t("messageWindow.chat") },
  ];

  const chat = useChatDrawer({
    currentTab: "activation",
    active: activeSection === "chat",
    onOpen: () => setActiveSection("chat"),
    onClose: () => setActiveSection("status"),
  });

  async function loadRequest(id) {
    const data = await api(`/requests/${encodeURIComponent(id)}`);
    setRequest({ ...data.req, display: data.display });
  }

  useEffect(() => {
    if (selectedRequest?.req_id) {
      setReqId(selectedRequest.req_id);
      loadRequest(selectedRequest.req_id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequest]);

  useEffect(() => {
    if (!reqId) {
      setRequest(null);
      return;
    }
    loadRequest(reqId).catch(() => setRequest(null));
  }, [reqId]);

  function selectedRow() {
    return selectedSerial;
  }

  async function activate() {
    const target = serial.trim() || selectedRow();
    if (!target)
      return notify(t("activationScreen.enterSerialOrSelectRow"), "error");

    const data = await api(
      `/requests/${encodeURIComponent(reqId)}/activation`,
      {
        method: "POST",
        body: { serial: target, date, notes },
      },
    );

    notify(t("activationScreen.loadedSerial", { target }));
    setRequest({ ...data.req, display: null });
    setSerial("");
    setNotes("");
  }

  async function activateAll() {
    if (!reqId) return notify(t("activationScreen.selectRequestFirst"), "error");
    if (!window.confirm(t("activationScreen.confirmActivateAll"))) return;

    const data = await api(
      `/requests/${encodeURIComponent(reqId)}/activation-all`,
      {
        method: "POST",
        body: { date, notes: "????? ????" },
      },
    );

    notify(t("activationScreen.loadedCount", { count: data.count }));
    setRequest({ ...data.req, display: null });
  }

  async function loadReport() {
    const q = new URLSearchParams({ source: "all", stage: "activation" });
    const labels = await api(`/requests/labels?${q}`);
    const all = await api(`/requests?source=all`);

    const rows = all
      .filter(
        (r) =>
          (r.raw.devices_data || []).length ||
          (r.raw.devices_serials || []).length,
      )
      .map((r) => {
        const total =
          (r.raw.devices_data || []).length ||
          (r.raw.devices_serials || []).length;
        const activated = Object.keys(r.raw.activation_data || {}).length;
        return {
          req_id: r.req_id,
          name: r.raw.name,
          total,
          activated,
          pending: total - activated,
        };
      });

    setReport({ labels: labels.labels, rows });
    setShowReport(true);
  }

  const devices = useMemo(() => {
    if (!request) return [];
    const activation = request.activation_data || {};
    const list = (request.devices_data || []).map((d) => ({
      serial: d.DecoderSerialNo || d.id || "",
      carton: d.CartonSerialNo || "",
      chip: d.ChipSerialNo || "",
      model: d.Model_name || "",
      active: activation[String(d.DecoderSerialNo || d.id || "")],
    }));

    const serials = request.devices_serials || [];
    for (const s of serials) {
      if (!list.some((x) => x.serial === String(s))) {
        list.push({
          serial: String(s),
          carton: "",
          chip: "",
          model: "",
          active: activation[String(s)],
        });
      }
    }

    return list;
  }, [request]);

  const sorted = useMemo(() => {
    return [...devices].sort((a, b) => {
      const cmp = String(a.serial).localeCompare(String(b.serial));
      return sortAsc ? cmp : -cmp;
    });
  }, [devices, sortAsc]);

  const activated = devices.filter((d) => d.active).length;

  const columns = [
    {
      title: t("activationScreen.serialNo"),
      render: (r) => (
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => {
            setSelectedSerial(r.serial);
            setSerial(r.serial);
          }}
        >
          {r.serial}
        </button>
      ),
    },
    { title: t("activationScreen.carton"), key: "carton" },
    { title: t("activationScreen.chip"), key: "chip" },
    { title: t("activationScreen.model"), key: "model" },
    {
      title: t("activationScreen.status"),
      render: (r) =>
        r.active ? (
          <span className="status-chip status-activated">
            {t("activationScreen.loaded")}
          </span>
        ) : (
          <span className="status-chip status-activation">
            {t("activationScreen.notLoaded")}
          </span>
        ),
    },
    {
      title: t("activationScreen.activationDate"),
      render: (r) => (r.active ? r.active.date : "—"),
    },
  ];

  function handleSavedRequestSelect(d) {
    const id = d.req.req_id || d.req.request_id || d.req_id;
    setReqId(id);
    setRequest({ ...d.req, display: d.display });
    setSelectedRequest?.({ req_id: id, req: d.req });
  }

  return (
    <div className="request-form-root">
      <RequestPanel
        source="all"
        stage="activation"
        title={t("activationScreen.pendingActivationRequests")}
        sections={["header", "notes", "invoice", "shipment", "devices"]}
        hideFinancial
        highlight={selectedRequest?.req_id}
        onSelect={(d) => {
          const id = d.req.req_id || d.req.request_id || d.req_id;
          setReqId(id);
          setRequest({ ...d.req, display: d.display });
          setSelectedRequest?.({ req_id: id, req: d.req });
        }}
      />

      <div className="request-form-layout">
        <div className="request-form-content">
          {activeSection === "chat" ? (
            chat.content
          ) : (
            <ActivationSection
            activeSection={activeSection}
            selectedRequest={selectedRequest}
            onSavedRequestSelect={handleSavedRequestSelect}
            reqId={reqId}
            setReqId={setReqId}
            request={request}
            devices={devices}
            deviceRows={sorted}
            deviceColumns={columns}
            activated={activated}
            sortAsc={sortAsc}
            setSortAsc={setSortAsc}
            serial={serial}
            setSerial={setSerial}
            date={date}
            setDate={setDate}
            notes={notes}
            setNotes={setNotes}
            activate={activate}
            activateAll={activateAll}
            loadReport={loadReport}
              showReport={showReport}
              setShowReport={setShowReport}
              report={report}
            />
          )}
        </div>
        <div className="request-form-sidebar">
          {drawerItems.map((item) =>
            item.key === "chat" ? (
              chat.menuItem
            ) : (
              <button
                key={item.key}
                type="button"
                className={`accordion-btn ${activeSection === item.key ? "active" : ""}`}
                onClick={() => setActiveSection(item.key)}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
