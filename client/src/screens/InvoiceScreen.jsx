import { useEffect, useState } from "react";
import { api, uploadImages } from "../api.js";
import { useNotify } from "../components/ui.jsx";
import RequestPanel from "../components/RequestPanel.jsx";
import ImagesModal from "../components/ImagesModal.jsx";
import { useNav } from "../App.jsx";
import InvoiceFormSection from "./InvoiceFormSection.jsx";
import InvoiceAttachmentsSection from "./InvoiceAttachmentsSection.jsx";
import DetailSection from "./DetailSection.jsx";
import ReturnsPanel from "../components/ReturnsPanel.jsx";
import DefectsPanel from "../components/DefectsPanel.jsx";

export default function InvoiceScreen() {
  const notify = useNotify();
  const { selectedRequest, setSelectedRequest, navigate } = useNav();

  const [current, setCurrent] = useState(null);
  const [reqId, setReqId] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [invDate, setInvDate] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [saleOrder, setSaleOrder] = useState("");
  const [invoiceImage, setInvoiceImage] = useState("");
  const [accountantImage, setAccountantImage] = useState("");
  const [view, setView] = useState(null);
  const [activeSection, setActiveSection] = useState("invoice");

  const drawerItems = [
    { key: "invoice", label: "الفاتورة" },
    { key: "saved", label: "البيانات المحفوظة" },
    { key: "return", label: "المرتجع" },
    { key: "defect", label: "العيب المصنعي" },
  ];

  useEffect(() => {
    if (selectedRequest && selectedRequest.req_id) {
      setReqId(selectedRequest.req_id);
    }
  }, [selectedRequest]);

  useEffect(() => {
    if (!reqId) {
      setCurrent(null);
      return;
    }

    api(`/requests/${encodeURIComponent(reqId)}`)
      .then((d) => setCurrent(d.req))
      .catch(() => setCurrent(null));
  }, [reqId]);

  useEffect(() => {
    if (!current) return;
    setReqId(current.req_id || current.request_id || "");
    setInvNumber(
      current.invoice_id ||
        current.invoice_number ||
        current.accountant_bill_number ||
        "",
    );
    setInvDate(current.invoice_date || "");
    setInvAmount(current.amount || "");
    setSaleOrder(current.sale_order || "");
    setInvoiceImage(current.invoice_image || current.invoice_images?.[0] || "");
    setAccountantImage(current.accountant_image || "");
  }, [current]);

  async function upload(files, kind) {
    const data = await uploadImages(files);
    if (data.urls && data.urls.length) {
      if (kind === "invoice") setInvoiceImage(data.urls[0]);
      else setAccountantImage(data.urls[0]);
    }
  }

  async function save() {
    if (!reqId) return notify("اختر طلباً أولاً", "error");
    if (!invNumber.trim() && !invoiceImage)
      return notify("أدخل رقم الفاتورة أو أرفق صورة الفاتورة", "error");

    const data = await api(`/requests/${encodeURIComponent(reqId)}/invoice`, {
      method: "POST",
      body: {
        invoice_id: invNumber,
        invoice_date: invDate,
        amount: invAmount,
        sale_order: saleOrder,
        images: [invoiceImage, accountantImage].filter(Boolean),
      },
    });

    notify(data.message || "تم حفظ الفاتورة");
    setCurrent(data.req);
    setSelectedRequest({ req_id: reqId, req: data.req });
  }

  function handleSavedRequestSelect(d) {
    const id = d.req?.req_id || d.req?.request_id || d.req_id;
    if (!id) return;
    setReqId(id);
    if (d.req) setCurrent(d.req);
  }

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
          source="all"
          title="البيانات المحفوظة"
          sections={[
            "header",
            "notes",
            "invoice",
            "shipment",
            "hand",
            "devices",
          ]}
          hideFinancial
          highlight={selectedRequest?.req_id}
          onSelect={handleSavedRequestSelect}
        />
      );
    }

    return (
      <>
        <InvoiceFormSection
          current={current}
          reqId={reqId}
          setReqId={setReqId}
          invNumber={invNumber}
          setInvNumber={setInvNumber}
          invDate={invDate}
          setInvDate={setInvDate}
          invAmount={invAmount}
          setInvAmount={setInvAmount}
          saleOrder={saleOrder}
          setSaleOrder={setSaleOrder}
          invoiceImage={invoiceImage}
          accountantImage={accountantImage}
          save={save}
          navigate={navigate}
        />
        <InvoiceAttachmentsSection
          invoiceImage={invoiceImage}
          accountantImage={accountantImage}
          upload={upload}
          setView={setView}
        />
      </>
    );
  }

  return (
    <div className="request-form-root">
      <RequestPanel
        source="all"
        stage="invoice"
        title="طلبات بانتظار الفاتورة"
        sections={["header", "notes"]}
        highlight={selectedRequest?.req_id}
        onSelect={(r) => {
          const id = r.req?.req_id || r.req?.request_id || r.req_id;
          if (!id) return;
          setReqId(id);
          setSelectedRequest({ req_id: id, req: r.req || null });
          if (r.req) {
            setCurrent(r.req);
          }
        }}
      />

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

      {view ? (
        <ImagesModal
          title="الفاتورة"
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </div>
  );
}
