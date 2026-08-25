import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import { DATA_DIR } from '../config.js';
import { readJson, writeJson } from '../store.js';
import { emitToTabs, emitBroadcast } from '../realtime.js';

const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const MAX_MESSAGES = 2000;

function loadMessages() {
  const stored = readJson(MESSAGES_FILE, []);
  return Array.isArray(stored) ? stored : [];
}

function saveMessages(messages) {
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(messages.length - MAX_MESSAGES);
  }
  writeJson(MESSAGES_FILE, messages);
}

export function messageRoutes() {
  const router = Router();

  router.get('/', (req, res) => {
    const tab = String(req.query.tab || '');
    const chatWith = req.query.with ? String(req.query.with) : null;
    let messages = loadMessages();
    if (tab && chatWith) {
      messages = messages.filter(
        (m) =>
          (m.fromTab === tab && m.toTab === chatWith) ||
          (m.fromTab === chatWith && m.toTab === tab)
      );
    } else if (tab) {
      messages = messages.filter((m) => !m.toTab || m.toTab === tab);
    } else if (chatWith) {
      messages = messages.filter((m) => !m.toTab || m.toTab === chatWith);
    }
    res.json({ messages });
  });

  router.post('/', (req, res) => {
    const { fromTab, toTab, toTabs, content, fromUser, attachment } = req.body || {};
    if (!fromTab) return res.status(400).json({ error: 'fromTab is required' });
    const trimmedContent = content ? String(content).trim() : '';
    if (!trimmedContent && !attachment)
      return res.status(400).json({ error: 'content or attachment is required' });

    let targets = Array.isArray(toTabs)
      ? [...new Set(toTabs.map(String).filter(Boolean))]
      : toTab
        ? [String(toTab)]
        : [];
    targets = targets.filter((t) => t !== fromTab);
    // No explicit targets = broadcast to every tab

    const now = new Date().toISOString();
    const base = {
      fromTab,
      content: trimmedContent,
      attachment: attachment ? String(attachment) : '',
      fromUser: fromUser || '',
      timestamp: now,
      read: false,
    };
    const created = targets.length
      ? targets.map((target) => ({
          id: crypto.randomUUID(),
          ...base,
          toTab: target,
        }))
      : [
          {
            id: crypto.randomUUID(),
            ...base,
            toTab: null,
          },
        ];

    const stored = loadMessages();
    stored.push(...created);
    saveMessages(stored);

    created.forEach((message) => {
      if (message.toTab) {
        emitToTabs([message.fromTab, message.toTab], 'message:new', message);
      } else {
        emitBroadcast('message:new', message);
      }
    });
    res.json({ messages: created });
  });

  router.post('/read', (req, res) => {
    const { id, ids } = req.body || {};
    const targets = Array.isArray(ids) ? ids : id ? [id] : [];
    if (!targets.length) return res.status(400).json({ error: 'id or ids required' });

    const messages = loadMessages();
    let changed = false;
    for (const m of messages) {
      if (targets.includes(m.id) && !m.read) {
        m.read = true;
        changed = true;
      }
    }
    if (changed) saveMessages(messages);
    res.json({ ok: true });
  });

  return router;
}
