const API = '';

async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : API + path;
  const options = {
    ...opts,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  };
  if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
  } else if (options.body instanceof FormData) {
    delete options.headers['Content-Type'];
  }
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    if (res.status === 401 && !path.includes('/auth/login')) {
      const msg = data?.error || 'Bitte erneut anmelden';
      if (typeof window !== 'undefined') window.location.replace('/?error=' + encodeURIComponent(msg));
    }
    const err = new Error(data?.error || res.statusText || 'Fehler');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const auth = {
  login: (email, password) => api('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (body) => api('/api/auth/register', { method: 'POST', body }),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  me: () => api('/api/auth/me'),
  changePassword: (currentPassword, newPassword) => api('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
};
const departments = {
  list: () => api('/api/departments'),
  create: (body) => api('/api/departments', { method: 'POST', body }),
  update: (id, body) => api('/api/departments/' + id, { method: 'PUT', body }),
  delete: (id) => api('/api/departments/' + id, { method: 'DELETE' }),
};
const users = {
  list: () => api('/api/users'),
  departments: () => api('/api/departments'),
  create: (body) => api('/api/users', { method: 'POST', body }),
  update: (id, body) => api('/api/users/' + id, { method: 'PUT', body }),
  delete: (id) => api('/api/users/' + id, { method: 'DELETE' }),
  setPassword: (id, newPassword) => api('/api/users/' + id + '/password', { method: 'PUT', body: { newPassword } }),
};
const shifts = {
  departments: () => api('/api/departments'),
  calendar: (start, end, departmentId) => {
    let p = '/api/shifts/calendar?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end);
    if (departmentId) p += '&departmentId=' + departmentId;
    return api(p);
  },
  my: () => api('/api/shifts/my'),
  create: (body) => api('/api/shifts', { method: 'POST', body }),
  update: (id, body) => api('/api/shifts/' + id, { method: 'PUT', body }),
  delete: (id) => api('/api/shifts/' + id, { method: 'DELETE' }),
  assign: (shiftId, userId) => api('/api/shifts/' + shiftId + '/assign', { method: 'POST', body: { userId } }),
  unassign: (shiftId, userId) => api('/api/shifts/' + shiftId + '/assign/' + userId, { method: 'DELETE' }),
};
const absences = {
  my: () => api('/api/absences/my'),
  all: () => api('/api/absences/all'),
  vacation: (startDate, endDate) => api('/api/absences/vacation', { method: 'POST', body: { startDate, endDate } }),
  sick: (startDate, endDate, reason) => api('/api/absences/sick', { method: 'POST', body: { startDate, endDate, reason } }),
  sickWithAttest: (formData) => fetch('/api/absences/sick', { method: 'POST', credentials: 'same-origin', body: formData }).then(async (r) => { const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch (_) {} if (!r.ok) { const err = new Error(data?.error || r.statusText); err.status = r.status; err.data = data; throw err; } return data; }),
  attestUrl: (id) => '/api/absences/' + id + '/attest',
  setStatus: (id, status, adminComment) => api('/api/absences/' + id + '/status', { method: 'PUT', body: { status, adminComment } }),
};
const availability = {
  list: (from, to) => api('/api/availability?from=' + from + '&to=' + to),
  add: (body) => api('/api/availability', { method: 'POST', body }),
  delete: (id) => api('/api/availability/' + id, { method: 'DELETE' }),
};
const dashboard = {
  stats: (year) => api('/api/dashboard/stats?year=' + (year || new Date().getFullYear())),
  vacationBalance: (year) => api('/api/dashboard/vacation-balance?year=' + (year || new Date().getFullYear())),
  today: () => api('/api/dashboard/today'),
};
const tasks = {
  list: () => api('/api/tasks'),
  create: (body) => api('/api/tasks', { method: 'POST', body }),
  update: (id, body) => api('/api/tasks/' + id, { method: 'PUT', body }),
  delete: (id) => api('/api/tasks/' + id, { method: 'DELETE' }),
};
const team = {
  list: () => api('/api/team'),
};
const messages = {
  conversations: () => api('/api/messages/conversations'),
  createConversation: (body) => api('/api/messages/conversations', { method: 'POST', body }),
  getConversation: (id, params) => {
    let path = '/api/messages/conversations/' + id;
    if (params?.limit) path += '?limit=' + params.limit;
    if (params?.beforeId) path += (params.limit ? '&' : '?') + 'beforeId=' + params.beforeId;
    return api(path);
  },
  getConversationInfo: (id) => api('/api/messages/conversations/' + id + '/info'),
  sendMessage: (convId, body, subject) => api('/api/messages/conversations/' + convId + '/messages', { method: 'POST', body: { body, subject: subject || undefined } }),
  markRead: (convId, lastReadMessageId) => api('/api/messages/conversations/' + convId + '/read', { method: 'POST', body: { lastReadMessageId } }),
  readAll: () => api('/api/messages/read-all', { method: 'POST' }),
  markAllRead: () => api('/api/messages/mark-all-read', { method: 'POST' }),
};
const notifications = {
  list: () => api('/api/notifications'),
  unreadCount: () => api('/api/notifications/unread-count'),
  markRead: (id) => api('/api/notifications/' + id + '/read', { method: 'PUT' }),
  readAll: () => api('/api/notifications/read-all', { method: 'PUT' }),
};
const locations = {
  list: () => api('/api/locations'),
  create: (body) => api('/api/locations', { method: 'POST', body }),
  update: (id, body) => api('/api/locations/' + id, { method: 'PUT', body }),
  delete: (id) => api('/api/locations/' + id, { method: 'DELETE' }),
};
const shiftSwap = {
  offers: () => api('/api/shift-swap/offers'),
  myOffers: () => api('/api/shift-swap/my-offers'),
  createOffer: (shiftId) => api('/api/shift-swap/offer', { method: 'POST', body: { shiftId } }),
  deleteOffer: (id) => api('/api/shift-swap/offer/' + id, { method: 'DELETE' }),
  request: (offerId) => api('/api/shift-swap/request', { method: 'POST', body: { offerId } }),
  myRequests: () => api('/api/shift-swap/requests'),
  acceptRequest: (id) => api('/api/shift-swap/request/' + id + '/accept', { method: 'POST' }),
  rejectRequest: (id) => api('/api/shift-swap/request/' + id + '/reject', { method: 'POST' }),
};
const time = {
  status: () => api('/api/time/status'),
  checkIn: (shiftId) => api('/api/time/check-in', { method: 'POST', body: { shiftId } }),
  checkOut: (shiftId) => api('/api/time/check-out', { method: 'POST', body: shiftId != null ? { shiftId } : {} }),
  me: (from, to) => api('/api/time/me?from=' + encodeURIComponent(from || '') + '&to=' + encodeURIComponent(to || '')),
  admin: (userId, from, to) => {
    let path = '/api/time/admin?from=' + encodeURIComponent(from || '') + '&to=' + encodeURIComponent(to || '');
    if (userId) path += '&userId=' + encodeURIComponent(userId);
    return api(path);
  },
};
const salary = {
  get: () => api('/api/salary'),
  save: (body) => api('/api/salary', { method: 'PUT', body }),
};
