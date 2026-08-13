import { useState } from "react";
import DetailSection from "../DetailSection.jsx";
import SummarySection from "./SummarySection.jsx";
import CartonImportSection from "./CartonImportSection.jsx";
import CustomerImportSection from "./CustomerImportSection.jsx";
import DeliverySection from "./DeliverySection.jsx";
import ActionsSection from "./ActionsSection.jsx";
import ReturnSection from "./ReturnSection.jsx";
import DefectSection from "./DefectSection.jsx";

export default function DevicesSection({
  activeSection,
  selectedRequest,
  onSavedRequestSelect,

  reqId,
  setReqId,
  storageId,
  setStorageId,
  countsFor,
  request,
  currentDevices,
  customerName,
  invoiceNumber,

  cartonNo,
  setCartonNo,
  cartonSku,
  setCartonSku,
  cartonDuration,
  setCartonDuration,
  fetchCarton,
  deleteCarton,
  cartonTable,
  setCartonTable,
  cartonSel,
  setCartonSel,

  custQuery,
  setCustQuery,
  addCustSelected,
  custSel,
  setCustSel,
  filteredCust,

  toggle,

  method,
  setMethod,
  bolNumber,
  setBolNumber,
  carrier,
  setCarrier,
  shipDate,
  setShipDate,
  shipImage,
  handDate,
  setHandDate,
  handReceiver,
  setHandReceiver,
  handNotes,
  setHandNotes,
  handImage,
  uploadImage,
  saveDelivery,
  setView,

  saveAndDeduct,
  deleteSelected,
  deleteAll,
  exportDevices,
}) {
  // Which import panel (if any) is expanded *underneath* معلومات الطلب.
  // This is deliberately separate from `activeSection` — opening one of
  // these must not replace/navigate away from the summary, it just
  // reveals more content below it.
  const [importPanel, setImportPanel] = useState(null);

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

  if (activeSection === "summary") {
    return (
      <>
        <SummarySection
          reqId={reqId}
          setReqId={setReqId}
          storageId={storageId}
          setStorageId={setStorageId}
          countsFor={countsFor}
          request={request}
          currentDevices={currentDevices}
          importPanel={importPanel}
          onToggleCarton={() =>
            setImportPanel((p) => (p === "carton" ? null : "carton"))
          }
          onToggleCustomer={() =>
            setImportPanel((p) => (p === "customer" ? null : "customer"))
          }
        />
        {importPanel === "carton" ? (
          <CartonImportSection
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
            customerName={customerName}
            invoiceNumber={invoiceNumber}
            toggle={toggle}
          />
        ) : null}
        {importPanel === "customer" ? (
          <CustomerImportSection
            custQuery={custQuery}
            setCustQuery={setCustQuery}
            addCustSelected={addCustSelected}
            custSel={custSel}
            setCustSel={setCustSel}
            filteredCust={filteredCust}
            customerName={customerName}
            invoiceNumber={invoiceNumber}
            toggle={toggle}
          />
        ) : null}
      </>
    );
  }

  if (activeSection === "return") {
    return <ReturnSection />;
  }

  if (activeSection === "defect") {
    return <DefectSection />;
  }

  if (activeSection === "delivery") {
    return (
      <DeliverySection
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
      />
    );
  }

  return (
    <ActionsSection
      saveAndDeduct={saveAndDeduct}
      deleteSelected={deleteSelected}
      deleteAll={deleteAll}
      exportDevices={exportDevices}
    />
  );
}
