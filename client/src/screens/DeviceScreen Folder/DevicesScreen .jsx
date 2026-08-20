import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, uploadImages } from "../../api.js";
import { useNotify } from "../../components/ui.jsx";
import RequestPanel from "../../components/RequestPanel.jsx";
import DevicesSection from "./DevicesSection .jsx";
import ImagesModal from "../../components/ImagesModal.jsx";
import { useNav } from "../../App.jsx";
import { exportCsv } from "../../utils.js";

export default function DevicesScreen() {
  const notify = useNotify();
  const { t } = useTranslation();
  const { selectedRequest, setSelectedRequest } = useNav();

  const [reqId, setReqId] = useState("");
  const [request, setRequest] = useState(null);
  const [storageId, setStorageId] = useState("storage_1");
  const [storageCounts, setStorageCounts] = useState([]);
  const [custItems, setCustItems] = useState([]);
  const [activeSection, setActiveSection] = useState("summary");

  const [cartonNo, setCartonNo] = useState("");
  const [cartonSku, setCartonSku] = useState("");
  const [cartonDuration, setCartonDuration] = useState("");
  const [cartonTable, setCartonTable] = useState([]);
  const [cartonSel, setCartonSel] = useState(new Set());

  const [custQuery, setCustQuery] = useState("");
  const [custSel, setCustSel] = useState(new Set());
  const [individualTable, setIndividualTable] = useState([]);
  const [individualSel, setIndividualSel] = useState(new Set());

  const [cartonFetchBusy, setCartonFetchBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const [method, setMethod] = useState("shipment");
  const [bolNumber, setBolNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [shipImage, setShipImage] = useState("");
  const [handDate, setHandDate] = useState("");
  const [handReceiver, setHandReceiver] = useState("");
  const [handNotes, setHandNotes] = useState("");
  const [handImage, setHandImage] = useState("");
  const [view, setView] = useState(null);

  const drawerItems = [
    { key: "summary", label: t("devicesScreen.drawerSummary") },
    { key: "delivery", label: t("devicesScreen.drawerDelivery") },
    { key: "actions", label: t("devicesScreen.drawerActions") },
    { key: "saved", label: t("devicesScreen.drawerSaved") },
    { key: "return", label: t("devicesScreen.drawerReturn") },
    { key: "defect", label: t("devicesScreen.drawerDefect") },
  ];

  async function loadRequest(id) {
    const data = await api(`/requests/${encodeURIComponent(id)}`);
    setRequest({ ...data.req, display: data.display });
  }

  useEffect(() => {
    if (selectedRequest && selectedRequest.req_id) {
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

  useEffect(() => {
    api(`/inventory?storage_id=${storageId}`)
      .then((d) => setStorageCounts(d.counts || []))
      .catch(() => {});
  }, [storageId, request]);

  useEffect(() => {
    api("/inventory/customer-items")
      .then((d) => setCustItems(d.items || []))
      .catch(() => {});
  }, [request]);

  const currentDevices = request
    ? request.devices_data || request.devices_serials || []
    : [];

  const customerName = request?.name || "—";
  const invoiceNumber = request?.display?.invoice_number || request?.invoice_number || "—";

  async function fetchCarton() {
    // Guard against a double Enter/click firing this twice before the first
    // call finishes — without this, both calls read the same (still empty)
    // `cartonTable` and both think none of the carton's devices are added
    // yet, so the whole carton gets pushed in twice.
    if (cartonFetchBusy) return;
    if (!cartonNo.trim()) return notify(t("devicesScreen.enterCartonNo"), "error");
    setCartonFetchBusy(true);
    try {
      const q = new URLSearchParams({
        carton: cartonNo.trim(),
        storage_id: storageId,
      });
      const d = await api(`/inventory/carton?${q}`);
      if (!d.items.length)
        return notify(
          t("devicesScreen.cartonNotFound", {
            carton: cartonNo.trim(),
            storage: t("storage." + storageId),
          }),
          "error",
        );
      const withMeta = d.items.map((it) => ({
        ...it,
        sku: cartonSku.trim(),
        duration: cartonDuration.trim(),
      }));
      const existing = new Set(cartonTable.map((r) => r.ID));
      const fresh = withMeta.filter((r) => !existing.has(r.ID));
      setCartonTable((t) => [...t, ...fresh]);
      notify(t("devicesScreen.addedFromCarton", { count: fresh.length }));
      setCartonNo("");
    } finally {
      setCartonFetchBusy(false);
    }
  }

  function deleteCarton() {
    if (!cartonNo.trim()) return notify(t("devicesScreen.enterCartonNo"), "error");
    const num = cartonNo.trim();
    const remaining = cartonTable.filter(
      (r) => String(r.CartonSerialNo || "") !== num,
    );
    const removedCount = cartonTable.length - remaining.length;
    if (!removedCount)
      return notify(
        t("devicesScreen.cartonNotInTable", { carton: num }),
        "error",
      );
    setCartonTable(remaining);
    setCartonSel((prev) => {
      const next = new Set(prev);
      for (const r of cartonTable) {
        if (String(r.CartonSerialNo || "") === num) next.delete(r.ID);
      }
      return next;
    });
    notify(t("devicesScreen.deletedFromCarton", { count: removedCount, carton: num }));
    setCartonNo("");
  }

  function addCustSelected() {
    const picked = custItems.filter((r) => custSel.has(r.ID));
    if (!picked.length)
      return notify(t("devicesScreen.selectFromCustomerStorage"), "error");
    const existing = new Set(individualTable.map((r) => r.ID));
    const fresh = picked.filter((r) => !existing.has(r.ID));
    setIndividualTable((t) => [...t, ...fresh]);
    notify(t("devicesScreen.addedDevices", { count: fresh.length }));
    setCustSel(new Set());
  }

  function deleteSelected() {
    const newCarton = cartonTable.filter((r) => !cartonSel.has(r.ID));
    const newIndividual = individualTable.filter(
      (r) => !individualSel.has(r.ID),
    );
    setCartonTable(newCarton);
    setIndividualTable(newIndividual);
    setCartonSel(new Set());
    setIndividualSel(new Set());
    notify(t("devicesScreen.deletedSelected"));
  }

  function deleteAll() {
    if (!window.confirm(t("devicesScreen.confirmDeleteAll"))) return;
    setCartonTable([]);
    setIndividualTable([]);
    setCartonSel(new Set());
    setIndividualSel(new Set());
  }

  function exportDevices() {
    exportCsv(
      `devices_${reqId || "table"}.csv`,
      [
        t("devicesScreen.customerName"),
        t("devicesScreen.invoiceNumber"),
        "ID",
        "CartonSerialNo",
        "DecoderSerialNo",
        "ChipSerialNo",
        "CardSerialNo",
        "Model_name",
        "SKU",
        t("devicesScreen.duration"),
      ],
      cartonTable
        .concat(individualTable)
        .map((r) => [
          customerName,
          invoiceNumber,
          r.ID,
          r.CartonSerialNo,
          r.DecoderSerialNo,
          r.ChipSerialNo,
          r.CardSerialNo,
          r.Model_name,
          r.sku,
          r.duration,
        ]),
    );
  }

  function buildDevicesData() {
    return [
      ...cartonTable.map((r) => ({ ...r, import_source: "carton" })),
      ...individualTable.map((r) => ({ ...r, import_source: "individual" })),
    ];
  }

  async function saveAndDeduct() {
    // Same class of bug as fetchCarton: without a lock, a second click
    // before the first request returns re-sends the same devices and the
    // server appended them again (server also de-dupes now, but stopping
    // the double request here is still the right fix).
    if (saveBusy) return;
    if (!reqId) return notify(t("devicesScreen.selectRequestFirst"), "error");
    const devices = buildDevicesData();
    if (!devices.length && !(request && request.devices_confirmed)) {
      return notify(t("devicesScreen.noDevicesInTables"), "error");
    }
    setSaveBusy(true);
    try {
      const data = await api(
        `/requests/${encodeURIComponent(reqId)}/confirm-dispatch`,
        {
          method: "POST",
          body: { devices_data: devices, storage_id: storageId },
        },
      );
      notify(data.summary || t("devicesScreen.savedAndDeducted"));
      setCartonTable([]);
      setIndividualTable([]);
      setCartonSel(new Set());
      setIndividualSel(new Set());
      setRequest({ ...data.req, display: null });
    } finally {
      setSaveBusy(false);
    }
  }

  async function uploadImage(files, kind) {
    const data = await uploadImages(files);
    if (data.urls && data.urls.length) {
      if (kind === "ship") setShipImage(data.urls[0]);
      else setHandImage(data.urls[0]);
    }
  }

  async function saveDelivery() {
    if (!reqId) return notify(t("devicesScreen.selectRequestFirst"), "error");
    if (method === "shipment") {
      if (!bolNumber.trim())
        return notify(t("devicesScreen.enterBolNumber"), "error");
      await api(`/requests/${encodeURIComponent(reqId)}/shipment`, {
        method: "POST",
        body: {
          bol_number: bolNumber,
          carrier,
          shipment_date: shipDate,
          image: shipImage,
        },
      });
      notify(t("devicesScreen.shipmentSaved"));
      setBolNumber("");
      setCarrier("");
      setShipDate("");
      setShipImage("");
    } else {
      await api(`/requests/${encodeURIComponent(reqId)}/hand-delivery`, {
        method: "POST",
        body: {
          delivery_date: handDate,
          receiver: handReceiver,
          notes: handNotes,
          image: handImage,
        },
      });
      notify(t("devicesScreen.handDeliverySaved"));
      setHandDate("");
      setHandReceiver("");
      setHandNotes("");
      setHandImage("");
    }
    loadRequest(reqId);
  }

  function handleSavedRequestSelect(d) {
    const id = d.req.req_id || d.req.request_id || d.req_id;
    setReqId(id);
    setRequest({ ...d.req, display: d.display });
  }

  const countsFor = useMemo(() => {
    const m = {};
    for (const c of storageCounts) m[c.id] = c.count;
    return m;
  }, [storageCounts]);

  const filteredCust = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return custItems;
    return custItems.filter((r) =>
      Object.values(r).some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [custItems, custQuery]);

  function toggle(set, setter, id) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="request-form-root">
      <RequestPanel
        source="all"
        stage="devices"
        title={t("devicesScreen.panelTitle")}
        sections={["header", "notes", "invoice", "shipment", "hand", "devices"]}
        highlight={selectedRequest?.req_id}
        showDetails={false}
        onSelect={(d) => {
          const id = d.req.req_id || d.req.request_id;
          setReqId(id);
          setRequest({ ...d.req, display: d.display });
          setSelectedRequest({ req_id: id, req: d.req });
        }}
      />
      <div className="request-form-layout">
        <div className="request-form-content">
          <DevicesSection
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            selectedRequest={selectedRequest}
            onSavedRequestSelect={handleSavedRequestSelect}
            reqId={reqId}
            setReqId={setReqId}
            storageId={storageId}
            setStorageId={setStorageId}
            countsFor={countsFor}
            request={request}
            currentDevices={currentDevices}
            customerName={customerName}
            invoiceNumber={invoiceNumber}
            cartonNo={cartonNo}
            setCartonNo={setCartonNo}
            cartonSku={cartonSku}
            setCartonSku={setCartonSku}
            cartonDuration={cartonDuration}
            setCartonDuration={setCartonDuration}
            fetchCarton={fetchCarton}
            deleteCarton={deleteCarton}
            cartonTable={cartonTable}
            setCartonTable={setCartonTable}
            cartonSel={cartonSel}
            setCartonSel={setCartonSel}
            custQuery={custQuery}
            setCustQuery={setCustQuery}
            addCustSelected={addCustSelected}
            custSel={custSel}
            setCustSel={setCustSel}
            filteredCust={filteredCust}
            toggle={toggle}
            method={method}
            setMethod={setMethod}
            bolNumber={bolNumber}
            setBolNumber={setBolNumber}
            carrier={carrier}
            setCarrier={setCarrier}
            shipDate={shipDate}
            setShipDate={setShipDate}
            shipImage={shipImage}
            handDate={handDate}
            setHandDate={setHandDate}
            handReceiver={handReceiver}
            setHandReceiver={setHandReceiver}
            handNotes={handNotes}
            setHandNotes={setHandNotes}
            handImage={handImage}
            uploadImage={uploadImage}
            saveDelivery={saveDelivery}
            setView={setView}
            saveAndDeduct={saveAndDeduct}
            deleteSelected={deleteSelected}
            deleteAll={deleteAll}
            exportDevices={exportDevices}
          />
        </div>
        <div className="request-form-sidebar">
          {drawerItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`accordion-btn ${activeSection === item.key ? "active" : ""}`}
              onClick={() => setActiveSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {view ? (
        <ImagesModal
          title={t("devicesScreen.shipImagesTitle")}
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </div>
  );
}
