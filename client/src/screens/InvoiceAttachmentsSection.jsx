import { Card } from "../components/ui.jsx";

export default function InvoiceAttachmentsSection({
  invoiceImage,
  accountantImage,
  upload,
  setView,
}) {
  return (
    <Card title="المرفقات">
      <div className="form-grid">
        <div className="field">
          <label>صورة أمر البيع</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => upload(e.target.files, "invoice")}
          />
          {invoiceImage ? (
            <div className="img-thumbs">
              <img
                className="img-thumb"
                src={invoiceImage}
                onClick={() => setView([invoiceImage])}
                alt=""
              />
            </div>
          ) : null}
        </div>
        <div className="field">
          <label>صورة الفاتورة المحاسبية</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => upload(e.target.files, "accountant")}
          />
          {accountantImage ? (
            <div className="img-thumbs">
              <img
                className="img-thumb"
                src={accountantImage}
                onClick={() => setView([accountantImage])}
                alt=""
              />
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
