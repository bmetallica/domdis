/* ═══════════════════════════════════════════════════════════════
   DOMDIS — API Layer
   Communicates with our Node.js backend which proxies to Domoticz
   ═══════════════════════════════════════════════════════════════ */

const API = (function () {

  async function get(url, params) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(url + qs);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function del(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  // ── Domoticz ─────────────────────────────────────────────────
  // NOTE: Domoticz 2024+ uses type=command&param=getdevices instead of type=devices

  async function getDomoticzDevices(filter) {
    const params = { type: 'command', param: 'getdevices', used: 'true', displayhidden: '0' };
    if (filter && filter !== 'all') {
      params.filter = filter;
    }
    return get('/api/domoticz/json.htm', params);
  }

  async function getAllDevices() {
    return get('/api/domoticz/json.htm', { type: 'command', param: 'getdevices', used: 'true', displayhidden: '0' });
  }

  async function getDeviceState(idx) {
    return get('/api/domoticz/json.htm', { type: 'command', param: 'getdevices', rid: idx });
  }

  async function getScenes() {
    return get('/api/domoticz/json.htm', { type: 'command', param: 'getscenes' });
  }

  async function getCameras() {
    return get('/api/domoticz/json.htm', { type: 'command', param: 'getcameras' });
  }

  async function setSwitch(idx, on) {
    const cmd = on ? 'On' : 'Off';
    return get('/api/domoticz/json.htm', { type: 'command', param: 'switchlight', idx, switchcmd: cmd });
  }

  async function setDimmer(idx, level) {
    return get('/api/domoticz/json.htm', {
      type: 'command', param: 'switchlight', idx,
      switchcmd: level > 0 ? 'Set Level' : 'Off', level
    });
  }

  async function setThermostat(idx, setPoint) {
    return get('/api/domoticz/json.htm', { type: 'command', param: 'setsetpoint', idx, setpoint: setPoint });
  }

  async function setBlinds(idx, cmd) {
    // cmd: 'Open', 'Close', 'Stop'
    return get('/api/domoticz/json.htm', { type: 'command', param: 'switchlight', idx, switchcmd: cmd });
  }

  async function triggerScene(idx, cmd) {
    // cmd: 'On' or 'Off'
    return get('/api/domoticz/json.htm', { type: 'command', param: 'switchscene', idx, switchcmd: cmd || 'On' });
  }

  async function setRGBColor(idx, hue, saturation, value) {
    return get('/api/domoticz/json.htm', {
      type: 'command', param: 'setcolbrightnessvalue',
      idx, hue, saturation, brightness: value
    });
  }

  async function setRGBWhite(idx, level) {
    return get('/api/domoticz/json.htm', {
      type: 'command', param: 'setcolbrightnessvalue',
      idx, hue: 0, saturation: 0, brightness: level
    });
  }

  async function testConnection() {
    return get('/api/domoticz/json.htm', { type: 'command', param: 'getversion' });
  }

  // ── Backend Settings ──────────────────────────────────────────

  async function getSettings() {
    return get('/api/settings');
  }

  async function saveSettings(settings) {
    return post('/api/settings', settings);
  }

  async function getPages() {
    return get('/api/pages');
  }

  async function savePages(data) {
    return post('/api/pages', data);
  }

  async function addPage(name) {
    return post('/api/pages/add', { name });
  }

  async function deletePage(id) {
    return del('/api/pages/' + id);
  }

  async function renamePage(id, name) {
    return post('/api/pages/' + id + '/rename', { name });
  }

  async function addWidget(pageId, widget) {
    return post('/api/pages/' + pageId + '/widgets', widget);
  }

  async function removeWidget(pageId, widgetId) {
    return del('/api/pages/' + pageId + '/widgets/' + widgetId);
  }

  async function reorderWidgets(pageId, order) {
    return post('/api/pages/' + pageId + '/reorder', { order });
  }

  return {
    getDomoticzDevices, getAllDevices, getDeviceState,
    getScenes, getCameras,
    setSwitch, setDimmer, setThermostat, setBlinds,
    triggerScene, setRGBColor, setRGBWhite,
    testConnection,
    getSettings, saveSettings,
    getPages, savePages, addPage, deletePage, renamePage,
    addWidget, removeWidget, reorderWidgets
  };
})();
