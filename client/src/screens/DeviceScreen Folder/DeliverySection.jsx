import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <Card id="delivery-card" title={t("deliverySection.title")}>
      <div className="radio-row">
        <label>
          <input
            type="radio"
            name="method"
            checked={method === "shipment"}
            onChange={() => setMethod("shipment")}
          />
          {t("deliverySection.shipment")}
        </label>
        <label>
          <input
            type="radio"
            name="method"
            checked={method === "hand"}
            onChange={() => setMethod("hand")}
          />
          {t("status.hand")}
        </label>
      </div>
      {method === "shipment" ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>{t("deliverySection.bolNumber")}</label>
            <input
              value={bolNumber}
              onChange={(e) => setBolNumber(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("deliverySection.carrier")}</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("deliverySection.shipDate")}</label>
            <input
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
              placeholder={t("deliverySection.datePlaceholder")}
            />
          </div>
          <div className="field">
            <label>{t("deliverySection.bolImage")}</label>
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
            <label>{t("deliverySection.receiveDate")}</label>
            <input
              value={handDate}
              onChange={(e) => setHandDate(e.target.value)}
              placeholder={t("deliverySection.datePlaceholder")}
            />
          </div>
          <div className="field">
            <label>{t("deliverySection.receiverName")}</label>
            <input
              value={handReceiver}
              onChange={(e) => setHandReceiver(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("deliverySection.notes")}</label>
            <input
              value={handNotes}
              onChange={(e) => setHandNotes(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("deliverySection.receiveImage")}</label>
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
          {t("deliverySection.saveDelivery")}
        </button>
      </div>
    </Card>
  );
}
