/* ═══════════════════════════════════════════════════════════════
   DOMDIS — Main Application
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────
  let settings = {};
  let pagesData = { pages: [] };
  let deviceStates = {};
  let cameraList   = [];
  let currentPageIndex = 0;
  let pollTimer = null;
  let energyPollTimer = null;
  let autoReturnTimer = null;
  let slideshowTimer = null;
  let nightModeTimer = null;
  let touchStartX = 0, touchStartY = 0;
  let isDragging = false;
  let editMode = false;
  let dragWidget = null, dragOverWidget = null;

  // ── View / Orientation ────────────────────────────────────────
  const VIEW = new URLSearchParams(window.location.search).get('view') === 'portrait'
    ? 'portrait' : 'landscape';
  let editView = VIEW;   // which orientation layout is being edited

  // ── DOM refs ──────────────────────────────────────────────────
  const pagesContainer  = document.getElementById('pages-container');
  const pageIndicators  = document.getElementById('page-indicators');
  const navLeft         = document.getElementById('page-nav-left');
  const navRight        = document.getElementById('page-nav-right');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsBtn     = document.getElementById('settings-btn');
  const settingsClose   = document.getElementById('settings-close');
  const fullscreenBtn   = document.getElementById('fullscreen-btn');
  const connStatus      = document.getElementById('connection-status');
  const editBtn         = document.getElementById('edit-btn');
  const widgetModal     = document.getElementById('widget-modal');

  // ── Boot ──────────────────────────────────────────────────────
  async function init() {
    startClock();
    await loadSettings();
    await loadPages();
    applyTheme(settings.theme || 'cyberpunk');
    renderPages();
    await pollDevices();
    await loadCameras();
    startPolling();
    startEnergyPolling();
    startAutoReturn();
    startNightMode();
    bindEvents();
    await initSettingsUI();
  }

  // ── Clock ─────────────────────────────────────────────────────
  function startClock() {
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    const days   = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    function tick() {
      const now = new Date();
      timeEl.textContent = now.toTimeString().slice(0,5);
      dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()}. ${months[now.getMonth()]}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── Settings & Pages Load ─────────────────────────────────────
  async function loadSettings() {
    try { settings = await API.getSettings(); }
    catch (e) { settings = { theme: 'cyberpunk', autoReturnTimeout: 30, pollInterval: 3000 }; }
  }

  async function loadPages() {
    try {
      pagesData = await API.getPages();
      if (!pagesData.pages) pagesData.pages = [];
    } catch (e) {
      pagesData = { pages: [{ id: 'page-1', name: 'Home', widgets: [] }] };
    }
  }

  async function loadCameras() {
    try {
      const res = await fetch('/api/domoticz/cameras');
      if (res.ok) {
        const data = await res.json();
        cameraList = data.cameras || [];
      }
    } catch (e) { cameraList = []; }
  }

  // ── Theme ─────────────────────────────────────────────────────
  function applyTheme(theme) {
    settings.theme = theme;
    document.getElementById('theme-css').href = `/css/themes/${theme}.css`;
    document.body.className = `theme-${theme}`;
  }

  // ── Page Rendering ────────────────────────────────────────────
  function renderPages() {
    pagesContainer.innerHTML = '';
    pageIndicators.innerHTML = '';

    pagesData.pages.forEach((page, idx) => {
      const pageEl = document.createElement('div');
      pageEl.className = 'page' + (editMode ? ' edit-mode' : '');
      pageEl.dataset.pageId = page.id;

      const nameEl = document.createElement('div');
      nameEl.className = 'page-name';
      nameEl.textContent = page.name;
      pageEl.appendChild(nameEl);

      if (editMode) {
        const editHint = document.createElement('div');
        editHint.className = 'edit-mode-hint';
        editHint.innerHTML =
          'BEARBEITUNGSMODUS &mdash; Widgets ziehen &middot; &#9881; Anpassen' +
          `<span class="edit-view-toggle">` +
          `<button class="edit-view-btn${editView==='landscape'?' active':''}" data-v="landscape">&#128444; Quer</button>` +
          `<button class="edit-view-btn${editView==='portrait'?' active':''}" data-v="portrait">&#128241; Hochkant</button>` +
          `</span>`;
        editHint.querySelectorAll('.edit-view-btn').forEach(btn => {
          btn.addEventListener('click', () => { editView = btn.dataset.v; renderPages(); });
        });
        pageEl.appendChild(editHint);
      }

      // Apply view class for correct grid column count
      document.body.classList.remove('view-portrait', 'view-landscape');
      document.body.classList.add('view-' + (editMode ? editView : VIEW));

      const grid = document.createElement('div');
      grid.className = 'widget-grid';
      pageEl.appendChild(grid);

      // Determine active view for this render pass
      const activeView = editMode ? editView : VIEW;
      const pl = page.portraitLayout || {};

      if (page.widgets.length === 0) {
        grid.innerHTML = `
          <div class="empty-page-hint" style="grid-column:1/-1">
            <div class="hint-icon">📟</div>
            <div>Keine Geräte auf dieser Seite.<br>Geräte in den Einstellungen hinzufügen.</div>
          </div>`;
      } else {
        // Sort widgets for the active view
        let sorted;
        if (activeView === 'portrait' && pl.order && pl.order.length) {
          const orderMap = {};
          pl.order.forEach((id, i) => { orderMap[id] = i; });
          sorted = [...page.widgets].sort((a, b) => {
            const ia = orderMap[a.id] !== undefined ? orderMap[a.id] : 9999;
            const ib = orderMap[b.id] !== undefined ? orderMap[b.id] : 9999;
            return ia - ib;
          });
        } else {
          sorted = [...page.widgets].sort((a, b) => (a.position||0) - (b.position||0));
        }

        sorted.forEach(widget => {
          const state = deviceStates[widget.deviceIdx];
          // Use portrait-specific size when applicable
          const effectiveWidget = activeView === 'portrait' && pl.sizes && pl.sizes[widget.id]
            ? Object.assign({}, widget, { size: pl.sizes[widget.id] })
            : widget;
          const el = Widgets.render(effectiveWidget, state || null);

          if (editMode) {
            el.draggable = true;
            // Edit overlay button
            const editOverlay = document.createElement('div');
            editOverlay.className = 'widget-edit-overlay';
            editOverlay.innerHTML = `
              <button class="widget-cfg-btn" title="Widget konfigurieren">⚙</button>
              <button class="widget-del-btn" title="Widget entfernen">🗑</button>`;
            el.appendChild(editOverlay);

            editOverlay.querySelector('.widget-cfg-btn').addEventListener('click', e => {
              e.stopPropagation();
              openWidgetConfig(widget, page.id);
            });
            editOverlay.querySelector('.widget-del-btn').addEventListener('click', async e => {
              e.stopPropagation();
              if (!confirm(`"${widget.deviceName}" von dieser Seite entfernen?`)) return;
              await API.removeWidget(page.id, widget.id);
              await loadPages();
              renderPages();
            });
            bindDragEvents(el, page.id);
          }

          grid.appendChild(el);
        });
      }

      pagesContainer.appendChild(pageEl);

      const dot = document.createElement('div');
      dot.className = 'page-dot' + (idx === currentPageIndex ? ' active' : '');
      dot.dataset.pageIndex = idx;
      dot.addEventListener('click', () => goToPage(idx));
      pageIndicators.appendChild(dot);
    });

    updateNavArrows();
    applyPageTransform();
  }

  function updateNavArrows() {
    navLeft.classList.toggle('hidden', currentPageIndex === 0);
    navRight.classList.toggle('hidden', currentPageIndex >= pagesData.pages.length - 1);
  }

  function applyPageTransform() {
    pagesContainer.style.transform = `translateX(-${currentPageIndex * 100}%)`;
    document.querySelectorAll('.page-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentPageIndex);
    });
    updateNavArrows();
  }

  function goToPage(idx) {
    if (idx < 0 || idx >= pagesData.pages.length) return;
    currentPageIndex = idx;
    applyPageTransform();
    resetAutoReturn();
  }

  function nextPage() { goToPage(currentPageIndex + 1); }
  function prevPage() { goToPage(currentPageIndex - 1); }

  // ── Device Polling (all devices) ─────────────────────────────
  async function pollDevices() {
    if (pagesData.pages.every(p => p.widgets.length === 0)) return;
    try {
      const res = await API.getAllDevices();
      if (res.result) res.result.forEach(d => { deviceStates[d.idx] = d; });
      setConnectionStatus('online');
      updateWidgetStates();
    } catch (e) {
      setConnectionStatus('offline');
    }
  }

  // ── Fast Energy Polling (every 1s) ────────────────────────────
  function getEnergyWidgetIdxs() {
    const idxs = [];
    pagesData.pages.forEach(p => p.widgets.forEach(w => {
      if (w.deviceType === 'energy') idxs.push(w.deviceIdx);
    }));
    return idxs;
  }

  async function pollEnergyDevices() {
    const idxs = getEnergyWidgetIdxs();
    if (idxs.length === 0) return;
    try {
      const res = await API.getAllDevices();
      if (res.result) {
        res.result.forEach(d => {
          if (idxs.includes(d.idx) || idxs.includes(String(d.idx))) {
            deviceStates[d.idx] = d;
          }
        });
      }
      // Only re-render energy widgets
      document.querySelectorAll('.widget[data-widget-type="energy"]').forEach(el => {
        const widgetId = el.dataset.widgetId;
        const widget = findWidget(widgetId);
        if (!widget) return;
        const state = deviceStates[widget.deviceIdx];
        if (!state) return;
        const newEl = Widgets.render(widget, state);
        if (editMode) addEditOverlayToWidget(newEl, widget, findWidgetPageId(widgetId));
        el.replaceWith(newEl);
      });
    } catch (e) { /* silent */ }
  }

  function startEnergyPolling() {
    clearInterval(energyPollTimer);
    if (getEnergyWidgetIdxs().length === 0) return;
    energyPollTimer = setInterval(pollEnergyDevices, 1000);
  }

  function updateWidgetStates() {
    document.querySelectorAll('.widget[data-device-idx]').forEach(el => {
      if (el.dataset.widgetType === 'energy') return; // handled by energy poll
      const widgetId = el.dataset.widgetId;
      const widget = findWidget(widgetId);
      if (!widget) return;
      const state = deviceStates[widget.deviceIdx];
      if (!state) return;
      const newEl = Widgets.render(widget, state);
      if (editMode) addEditOverlayToWidget(newEl, widget, findWidgetPageId(widgetId));
      el.replaceWith(newEl);
    });
  }

  function addEditOverlayToWidget(el, widget, pageId) {
    el.draggable = true;
    const editOverlay = document.createElement('div');
    editOverlay.className = 'widget-edit-overlay';
    editOverlay.innerHTML = `
      <button class="widget-cfg-btn" title="Widget konfigurieren">⚙</button>
      <button class="widget-del-btn" title="Widget entfernen">🗑</button>`;
    el.appendChild(editOverlay);
    editOverlay.querySelector('.widget-cfg-btn').addEventListener('click', e => {
      e.stopPropagation(); openWidgetConfig(widget, pageId);
    });
    editOverlay.querySelector('.widget-del-btn').addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(`"${widget.deviceName}" entfernen?`)) return;
      await API.removeWidget(pageId, widget.id);
      await loadPages(); renderPages();
    });
    bindDragEvents(el, pageId);
  }

  function findWidget(widgetId) {
    for (const page of pagesData.pages) {
      const w = page.widgets.find(w => w.id === widgetId);
      if (w) return w;
    }
    return null;
  }

  function findWidgetPageId(widgetId) {
    for (const page of pagesData.pages) {
      if (page.widgets.find(w => w.id === widgetId)) return page.id;
    }
    return null;
  }

  function startPolling() {
    const interval = settings.pollInterval || 3000;
    pollTimer = setInterval(pollDevices, interval);
  }

  function setConnectionStatus(status) {
    connStatus.className = 'status-dot ' + status;
    connStatus.title = { online: 'Verbunden', offline: 'Keine Verbindung', connecting: 'Verbinde…' }[status] || status;
  }

  // ── Auto Return ───────────────────────────────────────────────
  function startAutoReturn() { resetAutoReturn(); }
  function resetAutoReturn() {
    clearTimeout(autoReturnTimer);
    const timeout = (settings.autoReturnTimeout || 30) * 1000;
    if (!timeout || !settings.homePage) return;
    autoReturnTimer = setTimeout(() => {
      const homeIdx = pagesData.pages.findIndex(p => p.id === settings.homePage);
      if (homeIdx >= 0 && homeIdx !== currentPageIndex) goToPage(homeIdx);
    }, timeout);
  }

  // ── Slideshow ─────────────────────────────────────────────────
  function startSlideshow() {
    clearInterval(slideshowTimer);
    if (!settings.slideshowMode?.enabled) return;
    const interval = (settings.slideshowMode.interval || 10) * 1000;
    slideshowTimer = setInterval(() => {
      goToPage((currentPageIndex + 1) % pagesData.pages.length);
    }, interval);
  }

  // ── Night Mode ────────────────────────────────────────────────
  function startNightMode() { checkNightMode(); nightModeTimer = setInterval(checkNightMode, 60000); }
  function checkNightMode() {
    if (!settings.nightMode?.enabled) { document.body.style.filter = ''; return; }
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = (settings.nightMode.startTime || '22:00').split(':').map(Number);
    const [eh, em] = (settings.nightMode.endTime   || '06:00').split(':').map(Number);
    const start = sh * 60 + sm, end = eh * 60 + em;
    const isNight = start > end ? (cur >= start || cur < end) : (cur >= start && cur < end);
    document.body.style.filter = isNight ? `brightness(${(settings.nightMode.brightness || 30) / 100})` : '';
  }

  // ── Edit Mode ─────────────────────────────────────────────────
  function toggleEditMode() {
    editMode = !editMode;
    editBtn.classList.toggle('edit-active', editMode);
    editBtn.title = editMode ? 'Bearbeitungsmodus beenden' : 'Bearbeitungsmodus';
    renderPages();
    if (!editMode) startEnergyPolling(); // restart energy poll after edit
  }

  // ── Widget Config Modal ───────────────────────────────────────
  function openWidgetConfig(widget, pageId) {
    const modal = document.getElementById('widget-modal');
    const wType = widget.deviceType || 'sensor';
    const displayTypes = Widgets.getDisplayTypes(wType);
    const sizes = Widgets.getSizes();
    const currentDT = widget.displayType || 'card';

    // Determine effective size for the active edit view
    const page = pagesData.pages.find(p => p.id === pageId);
    const pl = (page && page.portraitLayout) || {};
    const currentSize = editView === 'portrait'
      ? (pl.sizes && pl.sizes[widget.id] ? pl.sizes[widget.id] : widget.size || '1x1')
      : (widget.size || '1x1');

    const viewLabel = editView === 'portrait' ? ' (Hochkant)' : ' (Quer)';
    modal.querySelector('.modal-title').textContent = widget.deviceName + viewLabel;

    // Display types (shared across views)
    const dtGrid = modal.querySelector('.display-type-grid');
    dtGrid.innerHTML = '';
    displayTypes.forEach(dt => {
      const btn = document.createElement('button');
      btn.className = 'display-type-btn' + (dt.id === currentDT ? ' active' : '');
      btn.dataset.typeId = dt.id;
      btn.innerHTML = `<span class="dt-icon">${dt.icon}</span><span class="dt-label">${dt.label}</span>`;
      btn.addEventListener('click', async () => {
        dtGrid.querySelectorAll('.display-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        widget.displayType = dt.id;
        await API.savePages(pagesData);
        renderPages();
      });
      dtGrid.appendChild(btn);
    });

    // Size grid — saves to portrait or landscape slot depending on editView
    const sizeGrid = modal.querySelector('.size-grid');
    sizeGrid.innerHTML = '';
    sizes.forEach(sz => {
      const btn = document.createElement('button');
      btn.className = 'size-btn' + (sz.id === currentSize ? ' active' : '');
      btn.dataset.sizeId = sz.id;
      btn.innerHTML = `<span class="sz-preview sz-${sz.id}"></span><span class="dt-label">${sz.label}</span>`;
      btn.addEventListener('click', async () => {
        sizeGrid.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (editView === 'portrait' && page) {
          if (!page.portraitLayout) page.portraitLayout = { order: [], sizes: {} };
          page.portraitLayout.sizes[widget.id] = sz.id;
        } else {
          widget.size = sz.id;
        }
        await API.savePages(pagesData);
        renderPages();
      });
      sizeGrid.appendChild(btn);
    });

    modal.classList.remove('hidden');
    modal.querySelector('.modal-close').onclick = closeWidgetModal;
    modal.addEventListener('click', e => { if (e.target === modal) closeWidgetModal(); }, { once: true });
  }

  function closeWidgetModal() {
    document.getElementById('widget-modal').classList.add('hidden');
  }

  // ── Drag & Drop ───────────────────────────────────────────────
  function bindDragEvents(el, pageId) {
    el.addEventListener('dragstart', e => {
      dragWidget = el;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => el.style.opacity = '0.4', 0);
    });
    el.addEventListener('dragend', () => {
      el.style.opacity = '';
      document.querySelectorAll('.widget-drag-over').forEach(w => w.classList.remove('widget-drag-over'));
      if (dragWidget && dragOverWidget && dragWidget !== dragOverWidget) {
        swapWidgets(pageId, dragWidget.dataset.widgetId, dragOverWidget.dataset.widgetId);
      }
      dragWidget = null; dragOverWidget = null;
    });
    el.addEventListener('dragover', e => {
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      if (el !== dragWidget) {
        document.querySelectorAll('.widget-drag-over').forEach(w => w.classList.remove('widget-drag-over'));
        el.classList.add('widget-drag-over');
        dragOverWidget = el;
      }
    });
  }

  async function swapWidgets(pageId, id1, id2) {
    const page = pagesData.pages.find(p => p.id === pageId);
    if (!page) return;

    if (editView === 'portrait') {
      if (!page.portraitLayout) page.portraitLayout = { order: [], sizes: {} };
      // Build current portrait order, falling back to landscape order
      let order = page.portraitLayout.order && page.portraitLayout.order.length
        ? [...page.portraitLayout.order]
        : [...page.widgets].sort((a, b) => (a.position||0) - (b.position||0)).map(w => w.id);
      const i1 = order.indexOf(id1), i2 = order.indexOf(id2);
      if (i1 >= 0 && i2 >= 0) { const tmp = order[i1]; order[i1] = order[i2]; order[i2] = tmp; }
      page.portraitLayout.order = order;
      await API.reorderWidgets(pageId, order, 'portrait');
    } else {
      const w1 = page.widgets.find(w => w.id === id1);
      const w2 = page.widgets.find(w => w.id === id2);
      if (!w1 || !w2) return;
      [w1.position, w2.position] = [w2.position, w1.position];
      page.widgets.sort((a, b) => (a.position||0) - (b.position||0));
      await API.reorderWidgets(pageId, page.widgets.map(w => w.id));
    }
    renderPages();
  }

  // ── Touch / Swipe ─────────────────────────────────────────────
  function bindSwipeEvents() {
    const wrapper = document.getElementById('pages-wrapper');
    wrapper.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isDragging = false;
    }, { passive: true });
    wrapper.addEventListener('touchmove', () => { isDragging = true; }, { passive: true });
    wrapper.addEventListener('touchend', e => {
      if (!isDragging) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) nextPage(); else prevPage();
      }
      isDragging = false;
    }, { passive: true });

    let mouseDown = false, mouseStartX = 0;
    wrapper.addEventListener('mousedown', e => { mouseDown = true; mouseStartX = e.clientX; });
    wrapper.addEventListener('mouseup', e => {
      if (!mouseDown) return;
      mouseDown = false;
      if (editMode) return; // no swipe in edit mode
      const dx = e.clientX - mouseStartX;
      if (Math.abs(dx) > 60) { if (dx < 0) nextPage(); else prevPage(); }
    });
    wrapper.addEventListener('mouseleave', () => { mouseDown = false; });
  }

  // ── Events ────────────────────────────────────────────────────
  function bindEvents() {
    navLeft.addEventListener('click', prevPage);
    navRight.addEventListener('click', nextPage);
    settingsBtn.addEventListener('click', openSettings);
    settingsClose.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', e => { if (e.target === settingsOverlay) closeSettings(); });
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    editBtn.addEventListener('click', toggleEditMode);

    document.addEventListener('keydown', e => {
      if (settingsOverlay.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') nextPage();
        if (e.key === 'ArrowLeft')  prevPage();
        if (e.key === 'e' || e.key === 'E') toggleEditMode();
      }
      if (e.key === 'Escape') { closeSettings(); closeWidgetModal(); }
    });

    ['click','touchstart','keydown'].forEach(ev => {
      document.addEventListener(ev, resetAutoReturn, { passive: true });
    });

    bindSwipeEvents();
  }

  // ── Fullscreen ────────────────────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  // ── Settings UI ───────────────────────────────────────────────
  async function initSettingsUI() {
    bindTabSwitching();
    bindConnectionTab();
    bindAppearanceTab();
    bindPagesMgmtTab();
    bindDevicesTab();
    bindAutomationTab();
  }

  function openSettings() {
    settingsOverlay.classList.remove('hidden');
    populateSettingsForms();
    clearTimeout(autoReturnTimer);
  }

  function closeSettings() {
    settingsOverlay.classList.add('hidden');
    resetAutoReturn();
  }

  function bindTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
      });
    });
  }

  function populateSettingsForms() {
    document.getElementById('cfg-host').value   = settings.domoticz?.host     || '';
    document.getElementById('cfg-port').value   = settings.domoticz?.port     || 8080;
    document.getElementById('cfg-ssl').checked  = settings.domoticz?.ssl      || false;
    document.getElementById('cfg-user').value   = settings.domoticz?.username || '';
    document.getElementById('cfg-pass').value   = settings.domoticz?.password || '';

    document.querySelectorAll('.theme-card').forEach(c => {
      c.classList.toggle('active', c.dataset.theme === settings.theme);
    });

    document.getElementById('cfg-auto-return').value       = settings.autoReturnTimeout        || 30;
    document.getElementById('cfg-night-mode').checked      = settings.nightMode?.enabled        || false;
    document.getElementById('cfg-night-start').value       = settings.nightMode?.startTime      || '22:00';
    document.getElementById('cfg-night-end').value         = settings.nightMode?.endTime        || '06:00';
    document.getElementById('cfg-night-brightness').value  = settings.nightMode?.brightness     || 30;
    document.getElementById('cfg-slideshow').checked       = settings.slideshowMode?.enabled    || false;
    document.getElementById('cfg-slideshow-interval').value= settings.slideshowMode?.interval   || 10;

    populateHomePageDropdown();
    renderPagesManagement();
  }

  function populateHomePageDropdown() {
    const hp = document.getElementById('cfg-home-page');
    hp.innerHTML = '<option value="">— keine —</option>';
    pagesData.pages.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = p.name;
      if (p.id === settings.homePage) opt.selected = true;
      hp.appendChild(opt);
    });
  }

  // ── Connection Tab ────────────────────────────────────────────
  function bindConnectionTab() {
    document.getElementById('btn-save-connection').addEventListener('click', async () => {
      settings.domoticz = {
        host:     document.getElementById('cfg-host').value.trim(),
        port:     parseInt(document.getElementById('cfg-port').value) || 8080,
        ssl:      document.getElementById('cfg-ssl').checked,
        username: document.getElementById('cfg-user').value,
        password: document.getElementById('cfg-pass').value
      };
      await API.saveSettings(settings);
      showTestResult('Gespeichert ✓', 'ok');
    });
    document.getElementById('btn-test-connection').addEventListener('click', async () => {
      showTestResult('Verbinde…', '');
      try {
        const res = await API.testConnection();
        if (res.status === 'OK') showTestResult(`✓ Verbunden — Domoticz ${res.version || ''}`, 'ok');
        else showTestResult('✗ Fehlgeschlagen: ' + (res.message || ''), 'error');
      } catch (e) { showTestResult('✗ Fehler: ' + e.message, 'error'); }
    });
  }

  function showTestResult(msg, cls) {
    const el = document.getElementById('connection-test-result');
    el.textContent = msg; el.className = 'test-result ' + cls;
  }

  // ── Appearance Tab ────────────────────────────────────────────
  function bindAppearanceTab() {
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', async () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        applyTheme(card.dataset.theme);
        await API.saveSettings(settings);
      });
    });
  }

  // ── Pages Management Tab ──────────────────────────────────────
  function bindPagesMgmtTab() {
    document.getElementById('btn-add-page').addEventListener('click', async () => {
      const name = prompt('Seitenname:', 'Neue Seite');
      if (!name) return;
      await API.addPage(name);
      await loadPages();
      renderPages();
      populateSettingsForms();
    });
  }

  function renderPagesManagement() {
    const list = document.getElementById('pages-list');
    list.innerHTML = '';
    pagesData.pages.forEach(page => {
      const isHome = page.id === settings.homePage;
      const item = document.createElement('div');
      item.className = 'page-item';
      item.innerHTML = `
        <span class="page-item-name">${page.name}</span>
        ${isHome ? '<span class="home-badge">HOME</span>' : ''}
        <div class="page-item-actions">
          <button data-action="home"   data-id="${page.id}" title="Als Startseite">🏠</button>
          <button data-action="rename" data-id="${page.id}" title="Umbenennen">✏</button>
          ${pagesData.pages.length > 1 ? `<button data-action="delete" data-id="${page.id}" title="Löschen">🗑</button>` : ''}
        </div>`;
      item.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const { action, id } = btn.dataset;
          if (action === 'home') {
            settings.homePage = id; await API.saveSettings(settings); renderPagesManagement(); populateHomePageDropdown();
          } else if (action === 'rename') {
            const newName = prompt('Neuer Name:', page.name); if (!newName) return;
            await API.renamePage(id, newName); await loadPages(); renderPages(); renderPagesManagement();
          } else if (action === 'delete') {
            if (!confirm(`Seite "${page.name}" löschen?`)) return;
            await API.deletePage(id);
            if (settings.homePage === id) { settings.homePage = null; await API.saveSettings(settings); }
            await loadPages();
            if (currentPageIndex >= pagesData.pages.length) currentPageIndex = pagesData.pages.length - 1;
            renderPages(); renderPagesManagement();
          }
        });
      });
      list.appendChild(item);
    });
  }

  // ── Devices Tab ───────────────────────────────────────────────
  function bindDevicesTab() {
    document.getElementById('btn-load-devices').addEventListener('click', loadDevicesList);
    document.querySelector('[data-tab="devices"]').addEventListener('click', () => {
      const sel = document.getElementById('device-target-page');
      sel.innerHTML = '';
      pagesData.pages.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = p.name; sel.appendChild(opt);
      });
    });
  }

  async function loadDevicesList() {
    const category = document.getElementById('device-category').value;
    const list = document.getElementById('devices-list');
    list.innerHTML = '<div style="opacity:0.5;font-size:0.8rem">Lade…</div>';

    try {
      let devices = [];

      if (category === 'camera') {
        // Cameras from dedicated endpoint
        const res = await fetch('/api/domoticz/cameras');
        const data = await res.json();
        devices = (data.cameras || []).map(c => ({
          idx: c.idx, Name: c.name, Type: 'Camera', SubType: '', _isCam: true
        }));
      } else if (category === 'scene') {
        const res = await API.getScenes();
        devices = res.result || [];
      } else {
        const res = await API.getAllDevices();
        devices = (res.result || []).filter(d => matchesCategory(d, category));
      }

      if (devices.length === 0) {
        list.innerHTML = '<div style="opacity:0.5;font-size:0.8rem">Keine Geräte gefunden.</div>';
        return;
      }

      list.innerHTML = '';
      const addedIdxs = new Set();
      pagesData.pages.forEach(p => p.widgets.forEach(w => addedIdxs.add(String(w.deviceIdx))));

      devices.forEach(device => {
        const idx     = String(device.idx);
        const wType   = device._isCam ? 'camera' : Widgets.classifyDevice(device);
        const alreadyAdded = addedIdxs.has(idx);
        const item = document.createElement('div');
        item.className = 'device-item';
        item.innerHTML = `
          <span style="font-size:1.1rem">${Widgets.getIcon(wType, device.Type)}</span>
          <div style="flex:1">
            <div class="device-item-name">${device.Name}</div>
            <div class="device-item-type">${device.Type || ''} ${device.SubType ? '/ '+device.SubType : ''}</div>
          </div>
          ${alreadyAdded
            ? '<span class="device-already-added">bereits hinzugefügt</span>'
            : `<button class="btn-add-device" data-idx="${idx}" data-name="${escHtml(device.Name)}" data-type="${wType}">+ Hinzufügen</button>`
          }`;
        if (!alreadyAdded) {
          item.querySelector('.btn-add-device').addEventListener('click', async e => {
            const btn = e.target;
            const pageId = document.getElementById('device-target-page').value;
            if (!pageId) { alert('Bitte Seite auswählen.'); return; }
            btn.disabled = true; btn.textContent = '…';
            try {
              await API.addWidget(pageId, {
                deviceIdx: btn.dataset.idx,
                deviceName: btn.dataset.name,
                deviceType: btn.dataset.type
              });
              await loadPages(); renderPages();
              btn.textContent = '✓'; btn.style.opacity = '0.5';
              startEnergyPolling(); // restart in case energy device added
            } catch (err) { btn.disabled = false; btn.textContent = '+ Hinzufügen'; }
          });
        }
        list.appendChild(item);
      });
    } catch (e) {
      list.innerHTML = `<div style="color:#ff4444;font-size:0.8rem">Fehler: ${e.message}</div>`;
    }
  }

  function matchesCategory(device, category) {
    const type = (device.Type || '').toLowerCase();
    const sub  = (device.SubType || '').toLowerCase();
    const sw   = (device.SwitchType || '').toLowerCase();
    switch (category) {
      case 'all':        return true;
      case 'switch':     return (type.includes('light') || type.includes('switch')) && !sw.includes('dimmer') && !sub.includes('rgb');
      case 'dimmer':     return sw.includes('dimmer');
      case 'rgb':        return sub.includes('rgb') || sub.includes('ww');
      case 'temp':       return type.includes('temp') && !type.includes('hum');
      case 'hum':        return type.includes('humidity');
      case 'temp+hum':   return type.includes('temp+hum');
      case 'thermostat': return type.includes('thermostat') || sub.includes('setpoint');
      case 'wind':       return type.includes('wind');
      case 'rain':       return type.includes('rain');
      case 'uv':         return type.includes('uv');
      case 'baro':       return type.includes('baro');
      case 'blinds':     return sw.includes('blinds') || sw.includes('venetian');
      case 'energy':     return sub === 'kwh' || type.includes('p1') || sub.includes('energy');
      case 'scene':      return type === 'scene' || type === 'group';
      default:           return true;
    }
  }

  // ── Automation Tab ────────────────────────────────────────────
  function bindAutomationTab() {
    document.getElementById('btn-save-automation').addEventListener('click', async () => {
      settings.autoReturnTimeout  = parseInt(document.getElementById('cfg-auto-return').value) || 30;
      settings.homePage           = document.getElementById('cfg-home-page').value || null;
      settings.nightMode          = {
        enabled:    document.getElementById('cfg-night-mode').checked,
        startTime:  document.getElementById('cfg-night-start').value,
        endTime:    document.getElementById('cfg-night-end').value,
        brightness: parseInt(document.getElementById('cfg-night-brightness').value) || 30
      };
      settings.slideshowMode = {
        enabled:  document.getElementById('cfg-slideshow').checked,
        interval: parseInt(document.getElementById('cfg-slideshow-interval').value) || 10
      };
      await API.saveSettings(settings);
      startAutoReturn(); startSlideshow(); checkNightMode();
      alert('Gespeichert ✓');
    });
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Start ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

})();
