const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const SETTINGS_PATH = path.join(__dirname, '..', 'config', 'settings.json');
const PAGES_PATH = path.join(__dirname, '..', 'config', 'pages.json');

function readJson(filePath, defaultVal) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return defaultVal;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// --- Settings ---
router.get('/settings', (req, res) => {
  res.json(readJson(SETTINGS_PATH, {}));
});

router.post('/settings', (req, res) => {
  const current = readJson(SETTINGS_PATH, {});
  const updated = Object.assign({}, current, req.body);
  writeJson(SETTINGS_PATH, updated);
  res.json({ status: 'OK', settings: updated });
});

// --- Pages ---
router.get('/pages', (req, res) => {
  res.json(readJson(PAGES_PATH, { pages: [] }));
});

router.post('/pages', (req, res) => {
  writeJson(PAGES_PATH, req.body);
  res.json({ status: 'OK' });
});

// Add a new page
router.post('/pages/add', (req, res) => {
  const data = readJson(PAGES_PATH, { pages: [] });
  const newPage = {
    id: 'page-' + Date.now(),
    name: req.body.name || 'Neue Seite',
    icon: req.body.icon || 'grid',
    widgets: []
  };
  data.pages.push(newPage);
  writeJson(PAGES_PATH, data);
  res.json({ status: 'OK', page: newPage });
});

// Delete a page
router.delete('/pages/:id', (req, res) => {
  const data = readJson(PAGES_PATH, { pages: [] });
  data.pages = data.pages.filter(p => p.id !== req.params.id);
  writeJson(PAGES_PATH, data);
  res.json({ status: 'OK' });
});

// Rename a page
router.post('/pages/:id/rename', (req, res) => {
  const data = readJson(PAGES_PATH, { pages: [] });
  const page = data.pages.find(p => p.id === req.params.id);
  if (page) {
    page.name = req.body.name;
    writeJson(PAGES_PATH, data);
    res.json({ status: 'OK', page });
  } else {
    res.status(404).json({ status: 'ERROR', message: 'Page not found' });
  }
});

// Add widget to page
router.post('/pages/:id/widgets', (req, res) => {
  const data = readJson(PAGES_PATH, { pages: [] });
  const page = data.pages.find(p => p.id === req.params.id);
  if (!page) return res.status(404).json({ status: 'ERROR', message: 'Page not found' });

  const widget = {
    id: 'widget-' + Date.now(),
    deviceIdx: req.body.deviceIdx,
    deviceName: req.body.deviceName,
    deviceType: req.body.deviceType,
    subType: req.body.subType || '',
    position: page.widgets.length
  };
  page.widgets.push(widget);
  writeJson(PAGES_PATH, data);
  res.json({ status: 'OK', widget });
});

// Remove widget from page
router.delete('/pages/:pageId/widgets/:widgetId', (req, res) => {
  const data = readJson(PAGES_PATH, { pages: [] });
  const page = data.pages.find(p => p.id === req.params.pageId);
  if (!page) return res.status(404).json({ status: 'ERROR', message: 'Page not found' });
  page.widgets = page.widgets.filter(w => w.id !== req.params.widgetId);
  writeJson(PAGES_PATH, data);
  res.json({ status: 'OK' });
});

// Reorder widgets on page (optionally for a specific view)
router.post('/pages/:id/reorder', (req, res) => {
  const data = readJson(PAGES_PATH, { pages: [] });
  const page = data.pages.find(p => p.id === req.params.id);
  if (!page) return res.status(404).json({ status: 'ERROR', message: 'Page not found' });

  if (req.body.view === 'portrait') {
    if (!page.portraitLayout) page.portraitLayout = { order: [], sizes: {} };
    page.portraitLayout.order = req.body.order;
  } else {
    const orderMap = {};
    req.body.order.forEach((id, idx) => { orderMap[id] = idx; });
    page.widgets.forEach(w => { if (orderMap[w.id] !== undefined) w.position = orderMap[w.id]; });
    page.widgets.sort((a, b) => a.position - b.position);
  }
  writeJson(PAGES_PATH, data);
  res.json({ status: 'OK' });
});

module.exports = router;
