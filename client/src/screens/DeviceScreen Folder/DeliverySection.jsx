import { Card } from "../../components/ui.jsx";

export default function DeliverySection({
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
}) {
  return (
    <Card id="delivery-card" title="بيانات التوصيل">
      <div className="radio-row">
        <label>
          <input
            type="radio"
            name="method"
            checked={method === "shipment"}
            onChange={() => setMethod("shipment")}
          />
          شحن
        </label>
        <label>
          <input
            type="radio"
            name="method"
            checked={method === "hand"}
            onChange={() => setMethod("hand")}
          />
          استلام يدوي
        </label>
      </div>
      {method === "shipment" ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>رقم البوليصة</label>
            <input
              value={bolNumber}
              onChange={(e) => setBolNumber(e.target.value)}
            />
          </div>
          <div className="field">
            <label>شركة النقل</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
          <div className="field">
            <label>تاريخ الشحن</label>
            <input
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
              placeholder="يوم/شهر/سنة"
            />
          </div>
          <div className="field">
            <label>صورة البوليصة</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => uploadImage(e.target.files, "ship")}
            />
            {shipImage ? (
              <img
                className="img-thumb"
                src={shipImage}
                onClick={() => setView([shipImage])}
                alt=""
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>تاريخ الاستلام</label>
            <input
              value={handDate}
              onChange={(e) => setHandDate(e.target.value)}
              placeholder="يوم/شهر/سنة"
            />
          </div>
          <div className="field">
            <label>اسم المستلم</label>
            <input
              value={handReceiver}
              onChange={(e) => setHandReceiver(e.target.value)}
            />
          </div>
          <div className="field">
            <label>ملاحظات</label>
            <input
              value={handNotes}
              onChange={(e) => setHandNotes(e.target.value)}
            />
          </div>
          <div className="field">
            <label>صورة الاستلام</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => uploadImage(e.target.files, "hand")}
            />
            {handImage ? (
              <img
                className="img-thumb"
                src={handImage}
                onClick={() => setView([handImage])}
                alt=""
              />
            ) : null}
          </div>
        </div>
      )}
      <div className="form-row" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={saveDelivery}>
          حفظ بيانات التوصيل
        </button>
      </div>
    </Card>
  );
}
