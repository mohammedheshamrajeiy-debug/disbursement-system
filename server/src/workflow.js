import {
  STATUS_INVOICED,
  STATUS_SHIPPED,
  DELIVERY_METHOD_SHIPMENT,
  DELIVERY_METHOD_HAND,
} from './config.js';

export function attachInvoice(request, { invoice_id, images = [], amount = 0, sale_order = '', invoice_date = '', accountant_image = '' }) {
  request.invoice_id = invoice_id;
  request.accountant_bill_number = invoice_id;
  request.invoice_number = invoice_id;
  request.invoice_images = [...(images || [])];
  request.invoice_image = images && images.length ? images[0] : '';
  request.accountant_invoice_image = accountant_image || '';
  request.invoice_amount = amount;
  request.sale_order = sale_order;
  request.invoice_date = invoice_date || new Date().toISOString().slice(0, 10);
  request.status = STATUS_INVOICED;
  request.invoice_added_at = new Date().toISOString();
  return request;
}

export function attachShipment(request, { bol_number, carrier = '', image = '', shipment_date = '' }) {
  request.delivery_method = DELIVERY_METHOD_SHIPMENT;
  request.shipment_id = bol_number;
  request.shipment_image = image || '';
  request.shipment_carrier = carrier;
  request.shipment_date = shipment_date || new Date().toISOString().slice(0, 10);
  request.status = STATUS_SHIPPED;
  request.shipment_added_at = new Date().toISOString();
  return request;
}

export function attachHandDelivery(request, { delivery_date, receiver = '', notes = '', image = '' }) {
  request.delivery_method = DELIVERY_METHOD_HAND;
  request.hand_delivery_date = delivery_date || new Date().toISOString().slice(0, 10);
  request.hand_delivery_receiver = receiver;
  request.hand_delivery_notes = notes;
  request.hand_delivery_image = image || '';
  request.status = STATUS_SHIPPED;
  request.hand_delivery_added_at = new Date().toISOString();
  return request;
}
