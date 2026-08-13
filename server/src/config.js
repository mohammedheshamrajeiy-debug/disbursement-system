import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = process.env.DISBURSEMENT_DATA_DIR || path.join(SERVER_DIR, 'data');
export const UPLOADS_DIR = path.join(SERVER_DIR, 'uploads');
export const PUBLIC_UPLOADS = '/uploads';

export const REQUEST_SOURCE_DISBURSEMENT = 'disbursement';
export const REQUEST_SOURCE_CUSTOMER = 'customer';
export const REQUEST_SOURCE_RETURN = 'return';
export const REQUEST_SOURCE_ALL = 'all';

export const INVENTORY_STORAGE_1 = 'storage_1';
export const INVENTORY_STORAGE_2 = 'storage_2';
export const INVENTORY_STORAGE_CUSTOMER = 'storage_customer';
export const INVENTORY_STORAGE_RETURN = 'storage_return';
export const INVENTORY_STORAGE_DEFECT = 'storage_defect';
export const DEFAULT_INVENTORY_STORAGE = INVENTORY_STORAGE_1;
export const INVENTORY_MAIN_STORAGE_IDS = [INVENTORY_STORAGE_1, INVENTORY_STORAGE_2];
export const INVENTORY_STORAGE_IDS = [
  INVENTORY_STORAGE_1,
  INVENTORY_STORAGE_2,
  INVENTORY_STORAGE_CUSTOMER,
  INVENTORY_STORAGE_RETURN,
  INVENTORY_STORAGE_DEFECT,
];
export const INVENTORY_STORAGE_LABELS = {
  [INVENTORY_STORAGE_1]: 'المخزون 1',
  [INVENTORY_STORAGE_2]: 'المخزون 2',
  [INVENTORY_STORAGE_CUSTOMER]: 'مخزن خدمة العملاء',
  [INVENTORY_STORAGE_RETURN]: 'مخزن المرتجع',
  [INVENTORY_STORAGE_DEFECT]: 'مخزن العيب المصنعي',
};

export const TAB_KEYS = {
  'طلب صرف': 'request',
  'خدمة عملاء': 'customer',
  'فاتورة المحاسب': 'invoice',
  'الأجهزة المصروفة': 'devices',
  'تحميل الاشتراكات': 'activation',
  'المخزون والرصيد': 'inventory',
  'سجل العمليات': 'log',
};
export const ALL_TAB_KEYS = Object.values(TAB_KEYS);

export const DEFAULT_USERS = {
  admin: { password: 'admin', role: 'مدير النظام', tabs: ALL_TAB_KEYS },
  cashier: { password: '1234', role: 'موظف صرف', tabs: ['request'] },
  accountant: { password: '1234', role: 'محاسب', tabs: ['invoice'] },
  warehouse: { password: '1234', role: 'موظف أجهزة', tabs: ['devices'] },
  tech: { password: '1234', role: 'موظف تحميل', tabs: ['activation'] },
  customer_service: { password: '1234', role: 'خدمة عملاء', tabs: ['customer'] },
};

export const INVENTORY_COLUMNS = [
  'ID',
  'CartonSerialNo',
  'DecoderSerialNo',
  'ChipSerialNo',
  'CardSerialNo',
  'Model_name',
  'CustomerName',
  'DefectType',
];

export const DEVICE_TABLE_COLUMNS = [
  ['id', 'ID', 40],
  ['carton', 'CartonSerialNo', 130],
  ['decoder', 'DecoderSerialNo', 130],
  ['chip', 'ChipSerialNo', 130],
  ['card', 'CardSerialNo', 130],
  ['model_name', 'Model_name', 120],
];

export const DEVICE_TREE_FIELD_MAP = {
  id: 'id',
  carton: 'CartonSerialNo',
  decoder: 'DecoderSerialNo',
  chip: 'ChipSerialNo',
  card: 'CardSerialNo',
  model_name: 'Model_name',
};

export const STATUS_PENDING = 'قيد الانتظار';
export const STATUS_INVOICED = 'تمت الفاتورة';
export const STATUS_DISPATCHED = 'تم صرف الأجهزة';
export const STATUS_SHIPPED = 'تم الشحن';
export const STATUS_ACTIVATING = 'قيد التحميل';
export const STATUS_FULLY_ACTIVATED = 'محمل بالكامل';

export const DELIVERY_METHOD_SHIPMENT = 'shipment';
export const DELIVERY_METHOD_HAND = 'hand';
