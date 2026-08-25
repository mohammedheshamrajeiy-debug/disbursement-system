import { api } from '../api.js';

/**
 * Send a message from one tab to another via the server.
 * @param {string} fromTab - The tab sending the message
 * @param {string|null} toTab - The target tab (null for broadcast)
 * @param {string} content - The message content
 * @param {string} fromUser - Optional user identifier
 */
export async function sendMessage(fromTab, toTab, content, fromUser = '', attachment = '') {
  if ((!content || content.trim() === '') && !attachment) return null;
  const data = await api('/messages', {
    method: 'POST',
    body: { fromTab, toTab: toTab || null, content, fromUser, attachment },
  });
  return data.messages ? data.messages[0] : data.message;
}

/**
 * Send the same message to multiple tabs at once.
 * @param {string} fromTab - The tab sending the message
 * @param {string[]} toTabs - Target tabs
 * @param {string} content - The message content
 * @param {string} fromUser - Optional user identifier
 * @returns {Promise<Array>} The created messages (one per target)
 */
export async function sendMessageToTabs(fromTab, toTabs, content, fromUser = '') {
  if (!content || content.trim() === '') return [];
  const targets = (Array.isArray(toTabs) ? toTabs : [toTabs]).filter(Boolean);
  if (!targets.length) return [];
  const data = await api('/messages', {
    method: 'POST',
    body: { fromTab, toTabs: targets, content, fromUser },
  });
  return data.messages || [];
}

/**
 * Get messages between two tabs (or for a single tab) from the server.
 * @param {string} tab - The current tab
 * @param {string|null} chatWithTab - Optional: the other tab in this conversation
 * @returns {Promise<Array>} Array of messages
 */
export async function getMessages(tab, chatWithTab = null) {
  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (chatWithTab) params.set('with', chatWithTab);
  const qs = params.toString();
  const data = await api(`/messages${qs ? `?${qs}` : ''}`);
  return data.messages || [];
}

/**
 * Mark one or more messages as read on the server.
 * @param {string|string[]} ids
 */
export async function markAsRead(ids) {
  const value = Array.isArray(ids) ? ids : [ids];
  if (!value.length) return;
  await api('/messages/read', { method: 'POST', body: { ids: value } });
}

/**
 * Poll the server for message updates. Call the callback after each fetch.
 * Returns a cleanup function that stops polling.
 * @param {Function} callback - Called with no arguments on every poll tick
 * @param {number} intervalMs - Polling interval (default 3000ms)
 */
export function subscribeToMessages(callback, intervalMs = 3000) {
  const timer = setInterval(() => {
    Promise.resolve(callback()).catch(() => {});
  }, intervalMs);
  return () => clearInterval(timer);
}
