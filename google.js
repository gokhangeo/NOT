/* Ajandam — Google Takvim bağlantısı.
 * Web: Google Identity Services (tarayıcıda açılır pencere).
 * Windows (Electron) ve iPhone: giriş ve istekler yerel köprüden (window.CepteNative) geçer,
 * böylece Google'ın "gömülü tarayıcı" engeline takılmaz ve yenileme anahtarı cihazda saklanır.
 * Saf yardımcılar (eventId, eventBody, plan...) Node testlerinde de kullanılır. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CepteGoogle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const API = 'https://www.googleapis.com/calendar/v3';
  const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'];
  const PREF = 'cepte_google', TOKEN = 'cepte_google_token', MAP = 'cepte_google_map';
  const DEFAULT_HINT = 'mersinkadastro33@gmail.com';
  const TZ = 'Europe/Istanbul';

  /* ---------- saf yardımcılar ---------- */
  // Google etkinlik kimliği yalnızca 0-9 ve a-v içerebilir: not kimliğinin UTF-8 onaltılık hâli bu kurala uyar.
  // Aynı not her cihazda aynı etkinliğe yazılır; çift kayıt oluşmaz.
  function eventId(noteId) {
    const bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(String(noteId)) : Buffer.from(String(noteId), 'utf8');
    let hex = 'cn';
    for (const b of bytes) hex += b.toString(16).padStart(2, '0');
    return hex.slice(0, 1000);
  }
  const plusDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dueOf = n => n.status === 'Bekliyor' && n.checkDate ? n.checkDate : n.dueDate;
  function wanted(n, prefs = {}) {
    if (!n || n.deletedAt || n.archivedAt || n.gcalSkip) return false;
    if (n.status === 'İptal') return false;
    if (n.completed && !prefs.includeCompleted) return false;
    return !!(n.alarmAt || dueOf(n));
  }
  function eventBody(n) {
    const lines = [];
    if (n.content) lines.push(n.content);
    const subs = (n.subTasks || []).map(s => `${s.completed ? '☑' : '☐'} ${s.text}`);
    if (subs.length) lines.push('', 'Alt görevler:', ...subs);
    if (n.status === 'Bekliyor' && n.waitingFor) lines.push('', 'Bekleniyor: ' + n.waitingFor);
    if (n.notes) lines.push('', n.notes);
    lines.push('', `${n.category || 'Diğer'} · ${n.priority || 'Normal'} · ${n.status || 'Yapılacak'}`, '— Ajandam');
    const body = {
      summary: (n.completed ? '✓ ' : '') + (n.title || 'Başlıksız'),
      description: lines.join('\n').trim(),
      status: 'confirmed',
      extendedProperties: { private: { cepteNot: String(n.id) } },
    };
    if (n.alarmAt) {
      const start = new Date(n.alarmAt), end = new Date(start.getTime() + 30 * 60000);
      body.start = { dateTime: start.toISOString(), timeZone: TZ };
      body.end = { dateTime: end.toISOString(), timeZone: TZ };
      body.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] };
    } else {
      const due = dueOf(n);
      body.start = { date: due };
      body.end = { date: plusDays(due, 1) };
      body.reminders = { useDefault: true };
    }
    const color = n.completed ? '8' : n.priority === 'Acil' ? '11' : n.priority === 'Yüksek' ? '6' : null;
    if (color) body.colorId = color;
    return body;
  }
  function hash(value) {
    const s = JSON.stringify(value); let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  // Hangi etkinliklerin yazılacağını / silineceğini hesaplar. map: {notId: {h, u}}
  function plan(notes, map = {}, prefs = {}) {
    const upserts = [], deletes = [], keep = new Set();
    for (const n of notes) {
      if (!wanted(n, prefs)) continue;
      keep.add(n.id);
      const body = eventBody(n), h = hash(body);
      if (!map[n.id] || map[n.id].h !== h) upserts.push({ note: n, body, h });
    }
    for (const id of Object.keys(map)) if (!keep.has(id)) deletes.push(id);
    return { upserts, deletes };
  }
  // Etkinliğin başlangıcını not alanlarına çevirir.
  function eventWhen(ev) {
    if (!ev || !ev.start) return null;
    if (ev.start.dateTime) return { alarmAt: new Date(ev.start.dateTime).toISOString(), day: localDay(new Date(ev.start.dateTime)) };
    if (ev.start.date) return { dueDate: ev.start.date, day: ev.start.date };
    return null;
  }
  function localDay(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  // Google tarafında taşınan/yeniden adlandırılan Ajandam etkinliğini nota uygular. Değişiklik yoksa null.
  function remoteChange(n, ev) {
    const mine = eventBody(n), when = eventWhen(ev);
    if (!when) return null;
    const patch = {};
    const title = String(ev.summary || '').replace(/^✓\s*/, '').trim();
    if (title && title !== n.title) patch.title = title;
    if (when.alarmAt) {
      if (!mine.start.dateTime || Date.parse(mine.start.dateTime) !== Date.parse(when.alarmAt)) { patch.alarmAt = when.alarmAt; patch.alarmTriggered = Date.parse(when.alarmAt) <= Date.now() ? !!n.alarmTriggered : false; }
    } else if (mine.start.dateTime || mine.start.date !== when.dueDate) {
      if (mine.start.dateTime) patch.alarmAt = null;
      if (n.status === 'Bekliyor' && n.checkDate) patch.checkDate = when.dueDate; else patch.dueDate = when.dueDate;
    }
    return Object.keys(patch).length ? patch : null;
  }
  // Etkinlikleri gün anahtarına göre gruplar (çok günlü etkinlik her güne yazılır, en fazla 31 gün).
  function byDay(events) {
    const out = {};
    for (const ev of events) {
      const when = eventWhen(ev); if (!when) continue;
      let last = when.day;
      if (ev.end && ev.end.date && ev.start.date) last = plusDays(ev.end.date, -1);
      else if (ev.end && ev.end.dateTime) last = localDay(new Date(Date.parse(ev.end.dateTime) - 1));
      let d = when.day;
      for (let i = 0; i < 31 && d <= last; i++, d = plusDays(d, 1)) (out[d] = out[d] || []).push(ev);
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => String(a.start.dateTime || '').localeCompare(String(b.start.dateTime || '')));
    return out;
  }

  /* ---------- tarayıcı tarafı ---------- */
  const ls = {
    get(k, fallback) { try { const v = root.localStorage && root.localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { root.localStorage.removeItem(k); } catch {} },
  };
  const native = () => root.CepteNative || null;
  function platform() { const n = native(); return n ? n.platform : 'web'; }
  function prefs() { return Object.assign({ connected: false, email: '', calendarId: 'primary', calendarName: '', includeCompleted: true, showEvents: true, pull: true }, ls.get(PREF, {})); }
  function setPrefs(patch) { const next = Object.assign(prefs(), patch); ls.set(PREF, next); return next; }
  function config() {
    const base = Object.assign({ web: '', desktop: '', desktopSecret: '', ios: '', hint: DEFAULT_HINT }, root.CEPTE_GOOGLE || {});
    const own = prefs().clients || {};
    for (const k of ['web', 'desktop', 'desktopSecret', 'ios']) if (own[k]) base[k] = own[k];
    return base;
  }
  function clientFor(p = platform()) {
    const c = config();
    if (p === 'electron') return { clientId: c.desktop, clientSecret: c.desktopSecret, hint: c.hint };
    if (p === 'ios') return { clientId: c.ios, hint: c.hint };
    return { clientId: c.web, hint: c.hint };
  }
  const configured = () => !!clientFor().clientId;

  let gisPromise = null, memToken = null;
  function loadGis() {
    if (root.google && root.google.accounts && root.google.accounts.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => resolve(); s.onerror = () => { gisPromise = null; reject(new Error('Google giriş betiği yüklenemedi (internet?)')); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }
  function cachedToken() {
    const t = memToken || ls.get(TOKEN, null);
    return t && t.expires_at - 60000 > Date.now() ? t : null;
  }
  function saveToken(t) {
    const tok = { access_token: t.access_token, expires_at: Date.now() + (Number(t.expires_in) || 3600) * 1000 };
    memToken = tok;
    if (platform() === 'web') ls.set(TOKEN, tok);
    return tok;
  }
  class NeedsAuth extends Error { constructor(m) { super(m || 'Google girişi gerekiyor'); this.needsAuth = true; } }

  async function webToken(interactive) {
    const cached = cachedToken(); if (cached) return cached;
    if (!interactive) throw new NeedsAuth();
    const { clientId, hint } = clientFor('web');
    if (!clientId) throw new Error('Google Web istemci kimliği girilmemiş (Ayarlar → Google Takvim).');
    await loadGis();
    return new Promise((resolve, reject) => {
      const client = root.google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: SCOPES.join(' '), login_hint: hint, include_granted_scopes: true,
        callback: resp => {
          if (resp.error) return reject(new Error(resp.error_description || resp.error));
          if (!root.google.accounts.oauth2.hasGrantedAllScopes(resp, SCOPES[0])) return reject(new Error('Takvim izni verilmedi. Bağlanırken takvim kutucuğunu işaretleyin.'));
          resolve(saveToken(resp));
        },
        error_callback: err => reject(new Error(err && err.type === 'popup_closed' ? 'Google penceresi kapatıldı.' : err && err.type === 'popup_failed_to_open' ? 'Açılır pencere engellendi. Tarayıcıda bu siteye açılır pencere izni verin.' : 'Google girişi tamamlanamadı.')),
      });
      client.requestAccessToken({ prompt: prefs().connected ? '' : 'consent' });
    });
  }
  async function nativeToken(interactive) {
    const cached = cachedToken(); if (cached) return cached;
    const c = clientFor();
    if (!c.clientId) throw new Error(platform() === 'ios' ? 'Google iOS istemci kimliği girilmemiş (Ayarlar → Google Takvim).' : 'Google Masaüstü istemci kimliği girilmemiş (Ayarlar → Google Takvim).');
    const args = { clientId: c.clientId, clientSecret: c.clientSecret || '', loginHint: c.hint, scopes: SCOPES };
    let res = await native().google(interactive ? 'signIn' : 'token', args);
    if (res && res.error === 'needs-auth') throw new NeedsAuth();
    if (!res || !res.access_token) throw new Error((res && res.error) || 'Google yanıt vermedi.');
    return saveToken(res);
  }
  const token = interactive => platform() === 'web' ? webToken(interactive) : nativeToken(interactive);

  async function http(req) {
    const n = native();
    if (n && n.http) return n.http(req);
    const r = await fetch(req.url, { method: req.method || 'GET', headers: req.headers, body: req.body });
    return { status: r.status, body: await r.text() };
  }
  async function api(path, { method = 'GET', query, body, interactive = false } = {}, retried = false) {
    const t = await token(interactive);
    let url = API + path;
    if (query) url += '?' + Object.entries(query).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
    const res = await http({ url, method, headers: Object.assign({ Authorization: 'Bearer ' + t.access_token }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
    if (res.status === 401 && !retried) { memToken = null; ls.del(TOKEN); return api(path, { method, query, body, interactive }, true); }
    let data = null; try { data = res.body ? JSON.parse(res.body) : null; } catch {}
    if (res.status >= 400) { const e = new Error((data && data.error && data.error.message) || ('Google ' + res.status)); e.status = res.status; throw e; }
    return data;
  }

  async function connect() {
    if (!configured()) throw new Error('Önce Google istemci kimliğini girin (Ayarlar → Google Takvim → İstemci kimlikleri).');
    await token(true);
    const list = await api('/users/me/calendarList', { query: { minAccessRole: 'writer' } });
    const items = (list && list.items) || [];
    const primary = items.find(c => c.primary) || items[0];
    const p = prefs();
    const chosen = items.find(c => c.id === p.calendarId) || primary;
    setPrefs({ connected: true, email: primary ? primary.id : '', calendarId: chosen ? chosen.id : 'primary', calendarName: chosen ? (chosen.summaryOverride || chosen.summary) : '' });
    return items.map(c => ({ id: c.id, name: c.summaryOverride || c.summary, primary: !!c.primary, color: c.backgroundColor }));
  }
  async function calendars() {
    const list = await api('/users/me/calendarList', { query: { minAccessRole: 'writer' } });
    return ((list && list.items) || []).map(c => ({ id: c.id, name: c.summaryOverride || c.summary, primary: !!c.primary, color: c.backgroundColor }));
  }
  async function disconnect() {
    const t = memToken || ls.get(TOKEN, null);
    try {
      if (platform() === 'web') { if (t && root.google && root.google.accounts) root.google.accounts.oauth2.revoke(t.access_token, () => {}); }
      else await native().google('signOut', {});
    } catch {}
    memToken = null; ls.del(TOKEN); ls.del(MAP);
    setPrefs({ connected: false, email: '' });
  }
  const cal = () => encodeURIComponent(prefs().calendarId || 'primary');
  async function upsert(id, body) {
    try { return await api(`/calendars/${cal()}/events/${id}`, { method: 'PUT', body }); }
    catch (e) {
      if (e.status !== 404) throw e;
      try { return await api(`/calendars/${cal()}/events`, { method: 'POST', body: Object.assign({ id }, body) }); }
      catch (e2) { if (e2.status === 409) return api(`/calendars/${cal()}/events/${id}`, { method: 'PUT', body }); throw e2; }
    }
  }
  async function remove(id) {
    try { await api(`/calendars/${cal()}/events/${id}`, { method: 'DELETE' }); }
    catch (e) { if (![404, 410].includes(e.status)) throw e; }
  }
  // Notları takvime yazar. Dönen değer: {written, removed}
  async function push(notes) {
    const p = prefs(); if (!p.connected) return { written: 0, removed: 0 };
    const map = ls.get(MAP, {});
    const { upserts, deletes } = plan(notes, map, p);
    let written = 0, removed = 0;
    for (const u of upserts) {
      const ev = await upsert(eventId(u.note.id), u.body);
      map[u.note.id] = { h: u.h, u: ev && ev.updated || new Date().toISOString() }; written++;
      ls.set(MAP, map);
    }
    for (const id of deletes) { await remove(eventId(id)); delete map[id]; removed++; ls.set(MAP, map); }
    return { written, removed };
  }
  async function removeNote(noteId) { await remove(eventId(noteId)); const map = ls.get(MAP, {}); delete map[noteId]; ls.set(MAP, map); }
  // Ay aralığındaki etkinlikleri getirir. Ajandam'un kendi etkinlikleri ayrı döner.
  async function events(fromDay, toDay) {
    const items = []; let pageToken;
    for (let i = 0; i < 5; i++) {
      const res = await api(`/calendars/${cal()}/events`, { query: { timeMin: new Date(fromDay + 'T00:00:00').toISOString(), timeMax: new Date(toDay + 'T23:59:59').toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: 250, pageToken } });
      items.push(...((res && res.items) || []));
      pageToken = res && res.nextPageToken; if (!pageToken) break;
    }
    const own = [], others = [];
    for (const ev of items) {
      if (ev.status === 'cancelled') continue;
      const noteId = ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.cepteNot;
      (noteId ? own : others).push(Object.assign(ev, noteId ? { noteId } : {}));
    }
    return { own, others };
  }
  // Google'da değiştirilen Ajandam etkinliklerini bulur: [{id, patch}]
  function remoteEdits(notes, own) {
    const map = ls.get(MAP, {}), out = [];
    for (const ev of own) {
      const n = notes.find(x => x.id === ev.noteId), m = map[ev.noteId];
      if (!n || !m || !ev.updated || Date.parse(ev.updated) <= Date.parse(m.u)) continue;
      const patch = remoteChange(n, ev);
      if (patch) out.push({ id: n.id, patch });
      m.u = ev.updated;
    }
    ls.set(MAP, map);
    return out;
  }

  return { SCOPES, DEFAULT_HINT, eventId, eventBody, wanted, plan, hash, remoteChange, eventWhen, byDay, localDay,
    platform, prefs, setPrefs, config, clientFor, configured, token, connect, calendars, disconnect, push, removeNote, events, remoteEdits, NeedsAuth };
});
