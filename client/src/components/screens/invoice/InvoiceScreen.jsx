import { useEffect, useState } from "react";
import { api, uploadImages } from "../../../api.js";
import { useNotify } from "../../ui.jsx";
import RequestPanel from "../../request/RequestPanel.jsx";
import ImagesModal from "../../request/ImagesModal.jsx";
import { useNav } from "../../../App.jsx";
import { useTranslation } from "react-i18next";
import InvoiceFormSection from "./InvoiceFormSection.jsx";
import DetailSection from "../../request/DetailSection.jsx";
import ReturnsPanel from "../../request/ReturnsPanel.jsx";
import DefectsPanel from "../../request/DefectsPanel.jsx";
import useChatDrawer from "../../chat/useChatDrawer.jsx";

export default function InvoiceScreen() {
  const notify = useNotify();
  const { t } = useTranslation();
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
    { key: "invoice", label: "invoiceScreen.invoice" },
    { key: "saved", label: "invoiceScreen.savedData" },
    { key: "return", label: "invoiceScreen.return" },
    { key: "defect", label: "invoiceScreen.defect" },
    { key: "chat", label: t("messageWindow.chat") },
  ];

  const chat = useChatDrawer({
    currentTab: "invoice",
    active: activeSection === "chat",
    onOpen: () => setActiveSection("chat"),
    onClose: () => setActiveSection("invoice"),
  });

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
    if (!reqId) return notify(t("invoiceScreen.selectRequestFirst"), "error");
    if (!invNumber.trim() && !invoiceImage)
      return notify(t("invoiceScreen.enterInvoiceNumberOrImage"), "error");

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

    notify(data.message || t("invoiceScreen.invoiceSaved"));
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
      return <ReturnsPanel title={t("invoiceScreen.returns")} />;
    }
    if (activeSection === "defect") {
      return <DefectsPanel title={t("invoiceScreen.defect")} />;
    }
    if (activeSection === "chat") {
      return chat.content;
    }
    if (activeSection === "saved") {
      return (
        <DetailSection
          source="all"
          title={t("invoiceScreen.savedData")}
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
        upload={upload}
        setView={setView}
        save={save}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="request-form-root">
      <RequestPanel
        source="all"
        stage="invoice"
        title={t("invoiceScreen.requestsAwaitingInvoice")}
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
                {t(item.label)}
              </button>
            ),
          )}
        </div>
      </div>

      {view ? (
        <ImagesModal
          title={t("invoiceScreen.invoice")}
          urls={view}
          onClose={() => setView(null)}
        />
      ) : null}
    </div>
  );
}
