import http from 'http';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DataManager } from './dataManager.js';
import { UPLOADS_DIR, PUBLIC_UPLOADS, SERVER_DIR } from './config.js';
import { ensureDir } from './store.js';
import { authRoutes, authRequired } from './routes/auth.js';
import { requestRoutes } from './routes/requests.js';
import { contactRoutes } from './routes/contacts.js';
import { inventoryRoutes } from './routes/inventory.js';
import { financialRoutes } from './routes/financial.js';
import { logRoutes } from './routes/log.js';
import { returnRoutes } from './routes/returns.js';
import { defectRoutes } from './routes/defects.js';
import { messageRoutes } from './routes/messages.js';
import { initRealtime } from './realtime.js';
import { middleware as i18nMiddleware } from './i18n.js';

const PORT = process.env.PORT || 4000;

const dm = new DataManager();
const app = express();

app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(i18nMiddleware);

ensureDir(UPLOADS_DIR);
app.use(PUBLIC_UPLOADS, express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file')
      .replace(/[^\w.\-\u0600-\u06FF]+/g, '_')
      .replace(/\s+/g, '_');
    const ext = path.extname(safe);
    const base = path.basename(safe, ext);
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.post('/api/upload', authRequired, upload.array('files', 10), (req, res) => {
  const urls = (req.files || []).map((f) => `${PUBLIC_UPLOADS}/${f.filename}`);
  res.json({ urls });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes(dm));
app.use('/api/requests', authRequired, requestRoutes(dm));
app.use('/api/contacts', authRequired, contactRoutes(dm));
app.use('/api/inventory', authRequired, inventoryRoutes(dm));
app.use('/api/financial', authRequired, financialRoutes(dm));
app.use('/api/log', authRequired, logRoutes(dm));
app.use('/api/returns', authRequired, returnRoutes(dm));
app.use('/api/defects', authRequired, defectRoutes(dm));
app.use('/api/messages', authRequired, messageRoutes());

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(SERVER_DIR, '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: req.t(err.message || 'errors.internal') });
});

const server = http.createServer(app);
initRealtime(server);

server.listen(PORT, () => {
  console.log(`[server] نظام إدارة الصرف - الخادم يعمل على http://localhost:${PORT}`);
  console.log(`[server] مسار البيانات: ${dm.dataDir}`);
});
