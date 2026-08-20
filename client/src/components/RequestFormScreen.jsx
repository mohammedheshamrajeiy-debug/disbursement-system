import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, uploadImages } from "../api.js";
import {
  Card,
  Field,
  Table,
  Modal,
  useNotify,
  fmtTime,
} from "../components/ui.jsx";
import DetailSection from "../screens/DetailSection.jsx";
import ImagesModal from "../components/ImagesModal.jsx";
import ReturnsPanel from "../components/ReturnsPanel.jsx";
import DefectsPanel from "../components/DefectsPanel.jsx";
import { useNav } from "../App.jsx";
import { sortArabicFirst } from "../utils.js";

export default function RequestFormScreen({ source, typeLabel }) {
  const { t } = useTranslation();
  const isCustomer = source === "customer";
  const notify = useNotify();
  const { setSelectedRequest } = useNav() || {};

  const [reqId, setReqId] = useState("");
  const [btype, setBtype] = useState(isCustomer ? "عميل" : "وكيل");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [receiver, setReceiver] = useState("");
  const [notes, setNotes] = useState("");
  const [notesImage, setNotesImage] = useState("");
  const [items, setItems] = useState([
    { device_type: "", count: "", description: "" },
  ]);
  const [names, setNames] = useState([]);
  const [history, setHistory] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [saved, setSaved] = useState(null);
  const [notesView, setNotesView] = useState(null);
  const [activeSection, setActiveSection] = useState("agent");

  async function loadId() {
    const data = await api(`/requests/next-id?source=${source}`);
    setReqId(data.req_id);
  }
  async function loadNames() {
    const data = await api(`/requests/names?source=${source}`);
    setNames(sortArabicFirst(data.names));
  }
  async function loadContacts() {
    const data = await api(`/contacts?source=${source}`);
    setContacts(sortArabicFirst(data.contacts, (c) => c.name));
  }

  useEffect(() => {
    loadId().catch(() => {});
    loadNames().catch(() => {});
    loadContacts().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  async function fetchHistory() {
    if (!name.trim()) return notify(t("requestForm.enterNameFirst"), "error");
    const q = new URLSearchParams({ source, name: name.trim() });
    const data = await api(`/requests/history?${q}`);
    setHistory(data.history);
    setShowHistory(true);
  }

  function addItem() {
    setItems((it) => [...it, { device_type: "", count: "", description: "" }]);
  }
  function setItem(i, key, val) {
    setItems((it) =>
      it.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)),
    );
  }
  function delItem(i) {
    setItems((it) => it.filter((_, idx) => idx !== i));
  }

  async function uploadNotesImage(files) {
    const data = await uploadImages(files);
    if (data.urls && data.urls.length) setNotesImage(data.urls[0]);
  }

  async function saveRequest() {
    if (!name.trim()) return notify(t("requestForm.enterName"), "error");
    const cleanItems = items
      .map((it) => ({
        device_type: it.device_type,
        count: it.count === "" ? "" : Number(it.count),
        description: it.description,
      }))
      .filter((it) => it.device_type && it.count !== "");
    if (!cleanItems.length)
      return notify(t("requestForm.enterItem"), "error");

    const data = await api("/requests", {
      method: "POST",
      body: {
        source,
        name: name.trim(),
        phone,
        region,
        receiver,
        beneficiary_type: btype,
        notes,
        notes_image: notesImage,
        items: cleanItems,
      },
    });
    notify(t("requestForm.savedSuccess", { id: data.req_id }));
    setSaved(data.req);
    setSelectedRequest?.({ req_id: data.req_id });
    setName("");
    setPhone("");
    setRegion("");
    setReceiver("");
    setNotes("");
    setNotesImage("");
    setItems([{ device_type: "", count: "", description: "" }]);
    loadId();
    loadNames();
  }

  async function saveContact() {
    if (!name.trim()) return notify(t("requestForm.enterNameFirst"), "error");
    await api("/contacts", {
      method: "POST",
      body: {
        source,
        name: name.trim(),
        phone,
        region,
        receiver,
        beneficiary_type: btype,
      },
    });
    notify(t("requestForm.contactSaved"));
    loadContacts();
  }

  async function deleteContact() {
    if (!name.trim()) return notify(t("requestForm.enterNameFirst"), "error");
    if (
      !window.confirm(
        t("requestForm.deleteConfirm", { name: name.trim() }),
      )
    )
      return;
    await api(
      `/contacts?source=${source}&name=${encodeURIComponent(name.trim())}`,
      {
        method: "DELETE",
      },
    );
    notify(t("requestForm.deleted"));
    loadNames();
  }

  function fillFromContact(contact) {
    setName(contact.name);
    setPhone(contact.phone || "");
    setRegion(contact.region || "");
    setReceiver(contact.receiver || "");
    if (contact.beneficiary_type) setBtype(contact.beneficiary_type);
  }

  function pickFromContacts(contact) {
    fillFromContact(contact);
    setShowContacts(false);
    notify(t("requestForm.selected", { name: contact.name }));
  }

  function handleNameChange(value) {
    setName(value);
    const match = contacts.find(
      (c) => c.name.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    if (match) fillFromContact(match);
  }

  function handleSavedSelect(d) {
    const req = d.req || d;
    setSaved(req);
    setSelectedRequest?.({ req_id: req.req_id || req.request_id });
  }

  const summary = useMemo(() => {
    if (!history) return null;
    const list = history.requests || [];
    return {
      total: list.length,
      invoice: list.filter((r) => r.invoice_complete).length,
      shipment: list.filter((r) => r.shipment_complete).length,
      dispatched: list.filter((r) => r.devices_dispatch_complete).length,
      activation: list.filter((r) => r.activation_complete).length,
      last: list[0],
    };
  }, [history]);

  const itemsColumns = [
    {
      title: t("requestForm.deviceType"),
      render: (r, i) => (
        <input
          value={r.device_type}
          onChange={(e) => setItem(i, "device_type", e.target.value)}
          placeholder={t("requestForm.exampleScreen")}
        />
      ),
    },
    {
      title: t("requestForm.quantity"),
      render: (r, i) => (
        <input
          style={{ width: 80 }}
          type="number"
          value={r.count}
          onChange={(e) => setItem(i, "count", e.target.value)}
        />
      ),
    },
    {
      title: t("requestForm.description"),
      render: (r, i) => (
        <input
          value={r.description}
          onChange={(e) => setItem(i, "description", e.target.value)}
          placeholder={t("common.optional")}
        />
      ),
    },
    {
      title: "",
      render: (_r, i) => (
        <button className="btn btn-danger btn-sm" onClick={() => delItem(i)}>
          {t("common.delete")}
        </button>
      ),
    },
  ];

  const sectionTitle = isCustomer
    ? t("requestForm.customerRequest")
    : t("requestForm.agentRequest");
  const drawerItems = [
    { key: "agent", label: sectionTitle },
    { key: "saved", label: t("requestForm.savedRequests") },
    { key: "return", label: t("requestForm.return") },
    { key: "defect", label: t("requestForm.defect") },
  ];

  function renderSection() {
    if (activeSection === "return") {
      return <ReturnsPanel title={t("requestForm.returns")} />;
    }
    if (activeSection === "defect") {
      return <DefectsPanel title={t("requestForm.defect")} />;
    }
    if (activeSection === "saved") {
      return (
        <DetailSection
          source={source}
          title={t("requestForm.savedRequestsWithType", { type: typeLabel })}
          sections={[
            "header",
            "notes",
            "invoice",
            "shipment",
            "hand",
            "devices",
          ]}
          hideFinancial
          highlight={saved ? saved.request_id : undefined}
          onSelect={handleSavedSelect}
        />
      );
    }

    return (
      <>
        <RequestInfoSection
          sectionTitle={sectionTitle}
          isCustomer={isCustomer}
          typeLabel={typeLabel}
          btype={btype}
          setBtype={setBtype}
          name={name}
          setName={handleNameChange}
          names={names}
          phone={phone}
          setPhone={setPhone}
          region={region}
          setRegion={setRegion}
          receiver={receiver}
          setReceiver={setReceiver}
          notes={notes}
          setNotes={setNotes}
          notesImage={notesImage}
          uploadNotesImage={uploadNotesImage}
          notesView={notesView}
          setNotesView={setNotesView}
          saveRequest={saveRequest}
          saveContact={saveContact}
          fetchHistory={fetchHistory}
          deleteContact={deleteContact}
          setShowContacts={() => {
            loadContacts().catch(() => {});
            setShowContacts(true);
          }}
          summary={summary}
        />
        <RequestItemsSection
          items={items}
          itemsColumns={itemsColumns}
          addItem={addItem}
          saveRequest={saveRequest}
          setItem={setItem}
          delItem={delItem}
        />
      </>
    );
  }

  return (
    <div className="request-form-root">
      <div className="request-form-layout">
        <div className="request-form-content">{renderSection()}</div>
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

      {showContacts ? (
        <Modal
          title={t("requestForm.contactsListTitle", { type: typeLabel })}
          onClose={() => setShowContacts(false)}
          wide
          footer={
            <button className="btn" onClick={() => setShowContacts(false)}>
              {t("common.close")}
            </button>
          }
        >
          <Table
            columns={[
              { title: t("requestForm.name"), key: "name" },
              { title: t("requestForm.phone"), key: "phone" },
              { title: t("requestForm.region"), key: "region" },
              { title: t("requestForm.receiver"), key: "receiver" },
              { title: t("requestForm.type"), key: "type" },
              {
                title: "",
                render: (r) => (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => pickFromContacts(r)}
                  >
                    {t("requestForm.choose")}
                  </button>
                ),
              },
            ]}
            rows={contacts}
            emptyText={t("common.noData")}
          />
        </Modal>
      ) : null}

      {showHistory && history ? (
        <Modal
          title={t("requestForm.historyTitle", { name })}
          onClose={() => setShowHistory(false)}
          wide
          footer={
            <button className="btn" onClick={() => setShowHistory(false)}>
              {t("common.close")}
            </button>
          }
        >
          <RequestHistoryList history={history} />
        </Modal>
      ) : null}

      {showRequests ? (
        <RequestsListModal
          source={source}
          onClose={() => setShowRequests(false)}
          onOpen={(req) => {
            setShowRequests(false);
            setSaved(req);
          }}
        />
      ) : null}

      {notesView ? (
        <ImagesModal
          title={t("requestForm.notesImage")}
          urls={notesView}
          onClose={() => setNotesView(null)}
        />
      ) : null}
    </div>
  );
}

function RequestInfoSection({
  sectionTitle,
  isCustomer,
  typeLabel,
  btype,
  setBtype,
  name,
  setName,
  names,
  phone,
  setPhone,
  region,
  setRegion,
  receiver,
  setReceiver,
  notes,
  setNotes,
  notesImage,
  uploadNotesImage,
  notesView,
  setNotesView,
  saveRequest,
  saveContact,
  fetchHistory,
  deleteContact,
  setShowContacts,
  summary,
}) {
  const { t } = useTranslation();
  return (
    <Card title={sectionTitle}>
      <div className="form-grid">
        <div className="field">
          <label>{t("requestForm.type")}</label>
          {isCustomer ? (
            <select value={btype} onChange={(e) => setBtype(e.target.value)}>
              <option value="عميل">{t("requestForm.btypeCustomer")}</option>
              <option value="عميل مخلص">{t("requestForm.btypeLoyalCustomer")}</option>
              <option value="عميل فردي">{t("requestForm.btypeIndividualCustomer")}</option>
            </select>
          ) : (
            <input value="وكيل" readOnly />
          )}
        </div>
        <div className="field">
          <label>{t("requestForm.nameLabel", { type: typeLabel })}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              list="names-list"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("requestForm.namePlaceholder")}
            />
            <datalist id="names-list">
              {names.map((n, i) => (
                <option key={i} value={n} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowContacts(true)}
            >
              {t("requestForm.list")}
            </button>
          </div>
        </div>
        <div className="field">
          <label>{t("requestForm.phone")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("requestForm.region")}</label>
          <input value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("requestForm.receiver")}</label>
          <input
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>{t("requestForm.notes")}</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t("requestForm.notesImage")}</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => uploadNotesImage(e.target.files)}
          />
          {notesImage ? (
            <div className="img-thumbs">
              <img
                className="img-thumb"
                src={notesImage}
                onClick={() => setNotesView([notesImage])}
                alt=""
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={saveContact}>
          {t("requestForm.saveAs", { type: typeLabel })}
        </button>
        <button className="btn" onClick={fetchHistory}>
          {t("requestForm.beneficiaryHistory")}
        </button>
        <button className="btn" onClick={deleteContact}>
          {t("requestForm.deleteUser")}
        </button>
      </div>

      {summary ? (
        <div className="info-bar" style={{ marginTop: 12 }}>
          <span>
            {t("requestForm.totalRequests")}: <b>{summary.total}</b>
          </span>
          <span>
            {t("requestForm.fullInvoices")}: <b>{summary.invoice}</b>
          </span>
          <span>
            {t("requestForm.shippingComplete")}: <b>{summary.shipment}</b>
          </span>
          <span>
            {t("requestForm.devicesComplete")}: <b>{summary.dispatched}</b>
          </span>
          <span>
            {t("requestForm.activationComplete")}: <b>{summary.activation}</b>
          </span>
          {summary.last ? (
            <span>
              {t("requestForm.lastRequest")}: <b>{summary.last.req_id}</b> (
              {fmtTime(summary.last.created_at)})
            </span>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function RequestItemsSection({ items, itemsColumns, addItem, saveRequest }) {
  const { t } = useTranslation();
  return (
    <Card title={t("requestForm.requestedItems")}>
      <Table
        columns={itemsColumns}
        rows={items}
        rowKey={(r, i) => i}
        emptyText={t("requestForm.addItemEmpty")}
      />
      <div className="form-row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={addItem}>
          + {t("requestForm.addItem")}
        </button>
        <button className="btn btn-primary" onClick={saveRequest}>
          {t("requestForm.saveRequest")}
        </button>
      </div>
    </Card>
  );
}

export function RequestHistoryList({ history }) {
  const { t } = useTranslation();
  const list = history.requests || [];
  const cols = [
    { title: t("requestForm.number"), key: "req_id" },
    { title: t("requestForm.date"), render: (r) => fmtTime(r.created_at) },
    {
      title: t("requestForm.status"),
      render: (r) => {
        const s = r.invoice_complete
          ? t("requestForm.done")
          : t("requestForm.inProgress");
        return <span className="status-chip status-invoice">{s}</span>;
      },
    },
    {
      title: t("requestForm.quantity"),
      render: (r) =>
        (r.items || []).reduce((s, it) => s + (Number(it.count) || 0), 0),
    },
  ];
  return (
    <Table
      columns={cols}
      rows={list}
      emptyText={t("requestForm.noHistory")}
    />
  );
}

export function RequestsListModal({ source, onClose, onOpen }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api(`/requests?source=${source}`)
      .then((d) => setRows(Array.isArray(d) ? d : d.requests || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const cols = [
    { title: t("requestForm.number"), key: "req_id" },
    { title: t("requestForm.name"), key: "name" },
    { title: t("requestForm.phone"), key: "phone" },
    { title: t("requestForm.date"), render: (r) => fmtTime(r.created_at) },
    {
      title: t("requestForm.status"),
      render: (r) => <span>{r.display ? r.display.status : r.status}</span>,
    },
    {
      title: t("requestForm.quantity"),
      render: (r) =>
        (r.items || []).reduce((s, it) => s + (Number(it.count) || 0), 0),
    },
    {
      title: "",
      render: (r) => (
        <button className="btn btn-sm btn-primary" onClick={() => onOpen(r)}>
          {t("common.show")}
        </button>
      ),
    },
  ];
  return (
    <Modal
      title={t("requestForm.requestsLog")}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          {t("common.close")}
        </button>
      }
    >
      <Table columns={cols} rows={rows} emptyText={t("requestForm.noRequests")} />
    </Modal>
  );
}
