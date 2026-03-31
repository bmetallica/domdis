const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

const router = express.Router();
const SETTINGS_PATH = path.join(__dirname, '..', 'config', 'settings.json');

// Camera config cache (5 min TTL)
let cameraCache = null;
let cameraCacheTime = 0;

function getSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch (e) {
    return { domoticz: { host: 'localhost', port: 8080, ssl: false, username: '', password: '' } };
  }
}

function buildDomoticzUrl(settings) {
  const proto = settings.domoticz.ssl ? 'https' : 'http';
  return `${proto}://${settings.domoticz.host}:${settings.domoticz.port}`;
}

function buildAuthHeader(settings) {
  if (settings.domoticz.username && settings.domoticz.password) {
    const b64 = Buffer.from(`${settings.domoticz.username}:${settings.domoticz.password}`).toString('base64');
    return { Authorization: `Basic ${b64}` };
  }
  return {};
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Proxy all Domoticz API requests
router.get('/json.htm', async (req, res) => {
  const settings = getSettings();
  const baseUrl = buildDomoticzUrl(settings);
  const headers = buildAuthHeader(settings);

  try {
    const response = await axios.get(`${baseUrl}/json.htm`, {
      params: req.query,
      headers,
      timeout: 8000,
      httpsAgent: settings.domoticz.ssl ? httpsAgent : undefined
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response ? err.response.status : 503;
    res.status(status).json({ status: 'ERROR', message: err.message });
  }
});

// Fetch camera list from Domoticz and return to frontend (no credentials exposed)
router.get('/cameras', async (req, res) => {
  const settings = getSettings();
  const baseUrl = buildDomoticzUrl(settings);
  const headers = buildAuthHeader(settings);

  try {
    const response = await axios.get(`${baseUrl}/json.htm`, {
      params: { type: 'command', param: 'getcameras' },
      headers,
      timeout: 8000,
      httpsAgent: settings.domoticz.ssl ? httpsAgent : undefined
    });

    const cameras = (response.data.result || []).map(cam => ({
      idx: cam.idx,
      name: cam.Name,
      enabled: cam.Enabled === 'true'
    }));

    res.json({ status: 'OK', cameras });
  } catch (err) {
    res.status(503).json({ status: 'ERROR', message: err.message });
  }
});

// Proxy camera snapshot — credentials stay on the server
router.get('/camera/:idx/snapshot', async (req, res) => {
  const settings = getSettings();
  const baseUrl = buildDomoticzUrl(settings);
  const headers = buildAuthHeader(settings);

  try {
    // Get (or use cached) camera list
    const now = Date.now();
    if (!cameraCache || now - cameraCacheTime > 5 * 60 * 1000) {
      const r = await axios.get(`${baseUrl}/json.htm`, {
        params: { type: 'command', param: 'getcameras' },
        headers,
        timeout: 8000,
        httpsAgent: settings.domoticz.ssl ? httpsAgent : undefined
      });
      cameraCache = r.data.result || [];
      cameraCacheTime = now;
    }

    const cam = cameraCache.find(c => String(c.idx) === String(req.params.idx));
    if (!cam) return res.status(404).json({ status: 'ERROR', message: 'Camera not found' });

    const proto = cam.Protocol === 1 ? 'https' : 'http';
    const camUrl = `${proto}://${cam.Address}:${cam.Port}/${cam.ImageURL}`;

    const camHeaders = {};
    if (cam.Username && cam.Password) {
      const b64 = Buffer.from(`${cam.Username}:${cam.Password}`).toString('base64');
      camHeaders['Authorization'] = `Basic ${b64}`;
    }

    const response = await axios.get(camUrl, {
      headers: camHeaders,
      responseType: 'stream',
      timeout: 10000,
      httpsAgent
    });

    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'no-store');
    response.data.pipe(res);
  } catch (err) {
    res.status(503).send('Camera unavailable');
  }
});

module.exports = router;
