import { useEffect, useMemo, useState } from "react";
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
    if (!name.trim()) return notify("أدخل اسم المستفيد أولاً", "error");
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
    if (!name.trim()) return notify("أدخل اسم المستفيد", "error");
    const cleanItems = items
      .map((it) => ({
        device_type: it.device_type,
        count: it.count === "" ? "" : Number(it.count),
        description: it.description,
      }))
      .filter((it) => it.device_type && it.count !== "");
    if (!cleanItems.length)
      return notify("أدخل صنفاً واحداً على الأقل (النوع والكمية)", "error");

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
    notify(`تم حفظ الطلب ${data.req_id} بنجاح`);
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
    if (!name.trim()) return notify("أدخل اسم المستفيد أولاً", "error");
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
    notify("تم حفظ بيانات المستفيد");
    loadContacts();
  }

  async function deleteContact() {
    if (!name.trim()) return notify("أدخل اسم المستفيد أولاً", "error");
    if (!window.confirm(`هل تريد حذف "${name.trim()}" من قائمة المستفيدين؟`))
      return;
    await api(
      `/contacts?source=${source}&name=${encodeURIComponent(name.trim())}`,
      {
        method: "DELETE",
      },
    );
    notify("تم الحذف");
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
    notify(`تم اختيار: ${contact.name}`);
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
      title: "نوع الجهاز",
      render: (r, i) => (
        <input
          value={r.device_type}
          onChange={(e) => setItem(i, "device_type", e.target.value)}
          placeholder="مثال: شاشة"
        />
      ),
    },
    {
      title: "الكمية",
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
      title: "الوصف",
      render: (r, i) => (
        <input
          value={r.description}
          onChange={(e) => setItem(i, "description", e.target.value)}
          placeholder="اختياري"
        />
      ),
    },
    {
      title: "",
      render: (_r, i) => (
        <button className="btn btn-danger btn-sm" onClick={() => delItem(i)}>
          حذف
        </button>
      ),
    },
  ];

  const sectionTitle = isCustomer ? "طلب العميل" : "طلب الوكيل";
  const drawerItems = [
    { key: "agent", label: sectionTitle },
    { key: "saved", label: "الطلبات المحفوظة" },
    { key: "return", label: "المرتجع" },
    { key: "defect", label: "العيب المصنعي" },
  ];

  function renderSection() {
    if (activeSection === "return") {
      return <ReturnsPanel title="المرتجعات" />;
    }
    if (activeSection === "defect") {
      return <DefectsPanel title="العيب المصنعي" />;
    }
    if (activeSection === "saved") {
      return (
        <DetailSection
          source={source}
          title={`الطلبات المحفوظة - ${typeLabel}`}
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
          title={`قائمة ال${typeLabel}ات`}
          onClose={() => setShowContacts(false)}
          wide
          footer={
            <button className="btn" onClick={() => setShowContacts(false)}>
              إغلاق
            </button>
          }
        >
          <Table
            columns={[
              { title: "الاسم", key: "name" },
              { title: "الهاتف", key: "phone" },
              { title: "المنطقة", key: "region" },
              { title: "المستلم", key: "receiver" },
              { title: "النوع", key: "type" },
              {
                title: "",
                render: (r) => (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => pickFromContacts(r)}
                  >
                    اختيار
                  </button>
                ),
              },
            ]}
            rows={contacts}
            emptyText="لا توجد بيانات"
          />
        </Modal>
      ) : null}

      {showHistory && history ? (
        <Modal
          title={`سجل ${name}`}
          onClose={() => setShowHistory(false)}
          wide
          footer={
            <button className="btn" onClick={() => setShowHistory(false)}>
              إغلاق
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
          title="صورة الملاحظات"
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
  return (
    <Card title={sectionTitle}>
      <div className="form-grid">
        <div className="field">
          <label>النوع</label>
          {isCustomer ? (
            <select value={btype} onChange={(e) => setBtype(e.target.value)}>
              <option>عميل</option>
              <option>عميل مخلص</option>
              <option>عميل فردي</option>
            </select>
          ) : (
            <input value="وكيل" readOnly />
          )}
        </div>
        <div className="field">
          <label>اسم {typeLabel}</label>
          <div className="form-row" style={{ gap: 6 }}>
            <input
              list="names-list"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب الاسم أو اختر من القائمة"
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
              القائمة
            </button>
          </div>
        </div>
        <div className="field">
          <label>الهاتف</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label>المنطقة</label>
          <input value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="field">
          <label>المستلم</label>
          <input
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>ملاحظات</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="field">
          <label>صورة الملاحظات</label>
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
          حفظ كـ{typeLabel}
        </button>
        <button className="btn" onClick={fetchHistory}>
          سجل المستفيد
        </button>
        <button className="btn" onClick={deleteContact}>
          حذف المستخدم
        </button>
      </div>

      {summary ? (
        <div className="info-bar" style={{ marginTop: 12 }}>
          <span>
            إجمالي الطلبات: <b>{summary.total}</b>
          </span>
          <span>
            فواتير كاملة: <b>{summary.invoice}</b>
          </span>
          <span>
            شحن مكتمل: <b>{summary.shipment}</b>
          </span>
          <span>
            أجهزة مكتملة: <b>{summary.dispatched}</b>
          </span>
          <span>
            تحميل مكتمل: <b>{summary.activation}</b>
          </span>
          {summary.last ? (
            <span>
              آخر طلب: <b>{summary.last.req_id}</b> (
              {fmtTime(summary.last.created_at)})
            </span>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function RequestItemsSection({ items, itemsColumns, addItem, saveRequest }) {
  return (
    <Card title="الأصناف المطلوبة">
      <Table
        columns={itemsColumns}
        rows={items}
        rowKey={(r, i) => i}
        emptyText="أضف صنفاً"
      />
      <div className="form-row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={addItem}>
          + إضافة صنف
        </button>
        <button className="btn btn-primary" onClick={saveRequest}>
          حفظ الطلب
        </button>
      </div>
    </Card>
  );
}

export function RequestHistoryList({ history }) {
  const list = history.requests || [];
  const cols = [
    { title: "الرقم", key: "req_id" },
    { title: "التاريخ", render: (r) => fmtTime(r.created_at) },
    {
      title: "الحالة",
      render: (r) => {
        const s = r.invoice_complete ? "تم" : "جاري";
        return <span className="status-chip status-invoice">{s}</span>;
      },
    },
    {
      title: "الكمية",
      render: (r) =>
        (r.items || []).reduce((s, it) => s + (Number(it.count) || 0), 0),
    },
  ];
  return (
    <Table columns={cols} rows={list} emptyText="لا يوجد سجل لهذا المستفيد" />
  );
}

export function RequestsListModal({ source, onClose, onOpen }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api(`/requests?source=${source}`)
      .then((d) => setRows(Array.isArray(d) ? d : d.requests || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const cols = [
    { title: "الرقم", key: "req_id" },
    { title: "الاسم", key: "name" },
    { title: "الهاتف", key: "phone" },
    { title: "التاريخ", render: (r) => fmtTime(r.created_at) },
    {
      title: "الحالة",
      render: (r) => <span>{r.display ? r.display.status : r.status}</span>,
    },
    {
      title: "الكمية",
      render: (r) =>
        (r.items || []).reduce((s, it) => s + (Number(it.count) || 0), 0),
    },
    {
      title: "",
      render: (r) => (
        <button className="btn btn-sm btn-primary" onClick={() => onOpen(r)}>
          عرض
        </button>
      ),
    },
  ];
  return (
    <Modal
      title="سجل الطلبات"
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          إغلاق
        </button>
      }
    >
      <Table columns={cols} rows={rows} emptyText="لا توجد طلبات" />
    </Modal>
  );
}
