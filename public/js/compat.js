/* ═══════════════════════════════════════════════════════════════
   DOMDIS — Compatibility Mode JavaScript  v3
   ES5 only — works on Android 4, iOS 5-6, IE9, Vista/7
   Uses jQuery 1.11, XHR polling, no CSS Grid/modern CSS
   ═══════════════════════════════════════════════════════════════ */

/* jshint esversion: 5 */
(function ($) {
  'use strict';

  var settings       = {};
  var pagesData      = { pages: [] };
  var deviceStates   = {};   // keyed by idx (string)
  var cameraList     = [];   // [{idx, Name, ImageURL, ...}]
  var currentPage    = 0;
  var pollTimer      = null;
  var autoReturnTimer = null;
  var nightModeTimer  = null;
  var camTimers      = {};   // widget.id → setInterval handle
  var touchStartX    = 0;

  // ── View / Orientation ────────────────────────────────────────
  var VIEW = (function () {
    var m = window.location.search.match(/[?&]view=([^&]+)/);
    return (m && m[1] === 'portrait') ? 'portrait' : 'landscape';
  }());

  // ── Boot ───────────────────────────────────────────────────────
  $(document).ready(function () {
    $('body').addClass('view-' + VIEW);
    startClock();
    loadSettings(function () {
      loadPages(function () {
        loadCameraList(function () {
          renderPageDots();
          renderCurrentPage();
          startPolling();
          startAutoReturn();
          startNightMode();
        });
      });
    });
    bindEvents();
  });

  // ── XHR helpers ───────────────────────────────────────────────
  function ajaxGet(url, params, cb, errCb) {
    $.ajax({
      url: url, type: 'GET',
      data: params || {}, dataType: 'json', timeout: 8000,
      success: cb,
      error: function (xhr, status, err) { if (errCb) errCb(err || status); }
    });
  }

  function ajaxPost(url, data, cb, errCb) {
    $.ajax({
      url: url, type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data), dataType: 'json', timeout: 8000,
      success: cb,
      error: function (xhr, status, err) { if (errCb) errCb(err || status); }
    });
  }

  function ajaxDelete(url, cb) {
    $.ajax({ url: url, type: 'DELETE', dataType: 'json', timeout: 8000, success: cb });
  }

  // ── Clock ─────────────────────────────────────────────────────
  function startClock() {
    var days   = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    var months = ['Jan','Feb','M\xe4r','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    function tick() {
      var now = new Date();
      var h = now.getHours(), m = now.getMinutes();
      $('#clock-time').text((h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m);
      $('#clock-date').text(days[now.getDay()] + ', ' + now.getDate() + '. ' + months[now.getMonth()]);
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── Data loaders ──────────────────────────────────────────────
  var VALID_THEMES = ['cyberpunk', 'matrix', 'bladerunner', 'tron', 'retrowave'];

  function applyTheme(name) {
    var theme = (VALID_THEMES.indexOf(name) >= 0) ? name : 'cyberpunk';
    var body = document.body;
    // Remove any existing theme class
    for (var i = 0; i < VALID_THEMES.length; i++) {
      body.className = body.className.replace('theme-' + VALID_THEMES[i], '');
    }
    body.className = (body.className + ' theme-' + theme).replace(/\s+/g, ' ').replace(/^\s|\s$/, '');
    $('#cfg-theme').val(theme);
  }

  function loadSettings(cb) {
    ajaxGet('/api/settings', {}, function (data) {
      settings = data || {};
      applyTheme(settings.theme || 'cyberpunk');
      if (cb) cb();
    }, function () {
      settings = { domoticz: { host: 'localhost', port: 8080 }, autoReturnTimeout: 30, pollInterval: 3000 };
      applyTheme('cyberpunk');
      if (cb) cb();
    });
  }

  function loadPages(cb) {
    ajaxGet('/api/pages', {}, function (data) {
      pagesData = data || { pages: [] };
      if (!pagesData.pages) pagesData.pages = [];
      if (cb) cb();
    }, function () {
      pagesData = { pages: [{ id: 'page-1', name: 'Home', widgets: [] }] };
      if (cb) cb();
    });
  }

  function loadCameraList(cb) {
    ajaxGet('/api/domoticz/cameras', {}, function (data) {
      // endpoint returns { cameras: [...] } — not result
      cameraList = (data && data.cameras) ? data.cameras : [];
      if (cb) cb();
    }, function () {
      cameraList = [];
      if (cb) cb();
    });
  }

  // ── Page dots ─────────────────────────────────────────────────
  function renderPageDots() {
    var html = '';
    for (var i = 0; i < pagesData.pages.length; i++) {
      html += '<span class="p-dot' + (i === currentPage ? ' p-dot-active' : '') +
              '" data-idx="' + i + '">&nbsp;</span>';
    }
    $('#page-dots').html(html);
  }

  function updateDots() {
    $('#page-dots .p-dot').each(function () {
      var idx = parseInt($(this).data('idx'), 10);
      $(this).toggleClass('p-dot-active', idx === currentPage);
    });
    $('#btn-prev').css('visibility', currentPage === 0 ? 'hidden' : 'visible');
    $('#btn-next').css('visibility', currentPage >= pagesData.pages.length - 1 ? 'hidden' : 'visible');
  }

  // ── Render current page ───────────────────────────────────────
  function renderCurrentPage() {
    // Clear all running camera refresh timers
    stopCamTimers();

    if (pagesData.pages.length === 0) {
      $('#widget-tbody').html(
        '<tr><td colspan="3" style="color:#2a2a45;font-size:12px;padding:30px;text-align:center">' +
        'Keine Seiten konfiguriert.</td></tr>');
      return;
    }

    var page = pagesData.pages[currentPage];
    $('#page-title').text(page.name);
    updateDots();

    var widgets = (page.widgets || []).slice(0);
    widgets.sort(function (a, b) { return (a.position || 0) - (b.position || 0); });

    if (widgets.length === 0) {
      $('#widget-tbody').html(
        '<tr><td colspan="3" style="color:#2a2a45;font-size:12px;padding:30px;text-align:center">' +
        'Keine Ger\xe4te auf dieser Seite.<br>In Einstellungen hinzuf\xfcgen.</td></tr>');
      return;
    }

    var rowsHtml = '';
    var COLS = (VIEW === 'portrait') ? 2 : 3;
    for (var i = 0; i < widgets.length; i++) {
      if (i % COLS === 0) rowsHtml += '<tr>';
      var w = widgets[i];
      var state = deviceStates[String(w.deviceIdx)] || null;
      rowsHtml += '<td class="widget-cell">' + buildWidgetHtml(w, state) + '</td>';
      if (i % COLS === COLS - 1) rowsHtml += '</tr>';
    }
    // Close last row if partial
    if (widgets.length % COLS !== 0) {
      var fill = COLS - (widgets.length % COLS);
      for (var f = 0; f < fill; f++) rowsHtml += '<td></td>';
      rowsHtml += '</tr>';
    }

    $('#widget-tbody').html(rowsHtml);
    bindWidgetEvents(page);
    startCamTimers(page);
  }

  // ── Camera image timers ───────────────────────────────────────
  function stopCamTimers() {
    for (var id in camTimers) {
      if (camTimers.hasOwnProperty(id)) clearInterval(camTimers[id]);
    }
    camTimers = {};
  }

  function startCamTimers(page) {
    var widgets = page.widgets || [];
    for (var i = 0; i < widgets.length; i++) {
      var w = widgets[i];
      if (w.deviceType === 'camera') {
        (function (widgetId, idx) {
          var handle = setInterval(function () {
            var img = $('#widget-tbody').find('[data-widget-id="' + widgetId + '"] .cam-img');
            if (img.length) {
              img.attr('src', '/api/domoticz/camera/' + idx + '/snapshot?t=' + Date.now());
            }
          }, 10000); // refresh every 10s
          camTimers[widgetId] = handle;
        })(w.id, w.deviceIdx);
      }
    }
  }

  // ── Widget HTML builders ──────────────────────────────────────
  function buildWidgetHtml(w, state) {
    var type = w.deviceType || 'sensor';
    // Auto-upgrade legacy switch widgets to correct type based on live state
    if (type === 'switch' && state) {
      var realType = matchType(state);
      if (realType === 'contact' || realType === 'motion' || realType === 'button') type = realType;
    }
    switch (type) {
      case 'switch':    return buildSwitch(w, state);
      case 'dimmer':    return buildDimmer(w, state);
      case 'rgb':       return buildRGB(w, state);
      case 'blinds':    return buildBlinds(w, state);
      case 'thermostat':return buildThermostat(w, state);
      case 'scene':     return buildScene(w, state);
      case 'energy':    return buildEnergy(w, state);
      case 'camera':    return buildCamera(w);
      case 'contact':   return buildContact(w, state);
      case 'motion':    return buildMotion(w, state);
      case 'button':    return buildButtonWidget(w, state);
      case 'spacer':    return '<div class="widget widget-spacer">&nbsp;</div>';
      default:          return buildSensor(w, state);
    }
  }

  function icon(type) {
    var m = {
      'switch':    '&#128161;', 'dimmer':    '&#128262;', 'rgb':    '&#127752;',
      'blinds':    '&#129695;', 'thermostat':'&#127777;', 'scene':  '&#127916;',
      'energy':    '&#9889;',   'camera':    '&#128247;', 'sensor': '&#128202;',
      'contact':   '&#128682;', 'motion':    '&#127939;', 'button': '&#128280;'
    };
    return m[type] || '&#128302;';
  }

  function iconForState(s) {
    if (!s) return icon('sensor');
    var t  = (s.Type      || '').toLowerCase();
    var st = (s.SubType   || '').toLowerCase();
    var sw = (s.SwitchType|| '').toLowerCase();
    if (sw.indexOf('door contact') >= 0)  return '&#128682;'; // 🚪
    if (sw === 'contact')                 return '&#128167;'; // 💧
    if (sw.indexOf('motion') >= 0)        return '&#127939;'; // 🏃
    if (sw.indexOf('push') >= 0)          return '&#128280;'; // 🔘
    if (t.indexOf('temp') >= 0)           return '&#127777;'; // 🌡
    if (t.indexOf('hum')  >= 0)           return '&#128167;'; // 💧
    if (t.indexOf('wind') >= 0)           return '&#128168;'; // 💨
    if (t.indexOf('rain') >= 0)           return '&#127783;'; // 🌧
    if (t.indexOf('uv')   >= 0)           return '&#9728;';   // ☀
    if (t.indexOf('baro') >= 0)           return '&#128309;'; // 🔵
    if (t.indexOf('lux')  >= 0)           return '&#9728;';   // ☀
    if (t.indexOf('air quality') >= 0)    return '&#127786;'; // 🌬
    if (t.indexOf('rfxmeter') >= 0)       return '&#128167;'; // 💧
    if (st === 'percentage')              return '&#128267;'; // 🔋
    if (st === 'voltage')                 return '&#128268;'; // 🔌
    if (st === 'distance')                return '&#128207;'; // 📏
    if (st.indexOf('voc') >= 0)           return '&#127786;'; // 🌬
    if (st.indexOf('custom') >= 0)        return '&#127787;'; // 🌫
    if (st === 'gas')                     return '&#128293;'; // 🔥
    return icon('sensor');
  }

  function buildSwitch(w, s) {
    var on = s && s.Status === 'On';
    return '<div class="widget' + (on ? ' widget-on' : '') +
      '" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="switch">' +
      '<span class="widget-icon">' + icon('switch') + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value">' + (on ? 'AN' : 'AUS') + '</span>' +
      '<div style="margin-top:6px">' +
      '<a href="#" class="sw-btn' + (on ? ' sw-btn-on' : '') + '" data-cmd="On">AN</a>' +
      '<a href="#" class="sw-btn" data-cmd="Off">AUS</a>' +
      '</div></div>';
  }

  function buildDimmer(w, s) {
    var level = (s && s.Level !== undefined) ? parseInt(s.Level, 10) : 0;
    var on = level > 0 || (s && s.Status === 'On');
    return '<div class="widget' + (on ? ' widget-on' : '') +
      '" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="dimmer">' +
      '<span class="widget-icon">' + icon('dimmer') + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value dim-val">' + level + '%</span>' +
      '<input type="range" min="0" max="100" value="' + level + '" class="dim-slider" />' +
      '</div>';
  }

  function buildRGB(w, s) {
    var level = (s && s.Level !== undefined) ? parseInt(s.Level, 10) : 100;
    var on = s && s.Status === 'On';
    var presets = ['#ff0000','#ff8800','#ffff00','#00ff00','#00ffff','#0088ff','#8800ff','#ff00ff','#ffffff'];
    var swatches = '';
    for (var i = 0; i < presets.length; i++) {
      swatches += '<a href="#" class="rgb-swatch" data-color="' + presets[i] +
                  '" style="background:' + presets[i] + '"></a>';
    }
    return '<div class="widget' + (on ? ' widget-on' : '') +
      '" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="rgb">' +
      '<span class="widget-icon">' + icon('rgb') + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<div class="rgb-swatches">' + swatches + '</div>' +
      '<div style="margin-top:4px">' +
      '<span style="font-size:10px;color:#444466">Helligkeit:</span>' +
      '<input type="range" min="0" max="100" value="' + level + '" class="dim-slider rgb-level" />' +
      '</div>' +
      '<div style="margin-top:4px">' +
      '<a href="#" class="sw-btn' + (on ? ' sw-btn-on' : '') + '" data-cmd="On">AN</a>' +
      '<a href="#" class="sw-btn" data-cmd="Off">AUS</a>' +
      '</div></div>';
  }

  function buildBlinds(w, s) {
    var status = (s && s.Status) ? s.Status : '\u2014';
    return '<div class="widget" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="blinds">' +
      '<span class="widget-icon">' + icon('blinds') + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value">' + escHtml(status) + '</span>' +
      '<div style="margin-top:6px">' +
      '<a href="#" class="blind-btn" data-cmd="Open">&#9650;</a>' +
      '<a href="#" class="blind-btn" data-cmd="Stop">&#9632;</a>' +
      '<a href="#" class="blind-btn" data-cmd="Close">&#9660;</a>' +
      '</div></div>';
  }

  function buildThermostat(w, s) {
    var sp = (s && s.SetPoint !== undefined) ? parseFloat(s.SetPoint) : 20.0;
    var cur = (s && s.Temp !== undefined) ? s.Temp : null;
    return '<div class="widget" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="thermostat" data-setpoint="' + sp + '">' +
      '<span class="widget-icon">' + icon('thermostat') + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<div class="thermo-row">' +
      '<a href="#" class="thermo-btn thermo-down">&#8722;</a>' +
      '<span class="thermo-val">' + sp.toFixed(1) + '&#176;</span>' +
      '<a href="#" class="thermo-btn thermo-up">+</a>' +
      '</div>' +
      (cur !== null ? '<span class="widget-unit">Ist: ' + cur + '\u00b0C</span>' : '') +
      '</div>';
  }

  function buildScene(w, s) {
    var on = s && s.Status === 'On';
    return '<div class="widget' + (on ? ' widget-on' : '') +
      '" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="scene">' +
      '<span class="widget-icon">' + icon('scene') + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value">AUSL\xd6SEN</span>' +
      '</div>';
  }

  function buildEnergy(w, s) {
    var watt  = s ? parseWatt(s.Usage)    : '\u2014';
    var today = s ? parseKwh(s.CounterToday) : '\u2014';
    var total = s ? parseKwh(s.Data)      : '\u2014';
    return '<div class="widget" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="energy">' +
      '<span class="widget-icon">' + icon('energy') + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value energy-watt">' + watt + '</span>' +
      '<div class="energy-rows">' +
      '<div class="energy-row"><span class="energy-lbl">Heute:</span><span class="energy-today">' + today + '</span></div>' +
      '<div class="energy-row"><span class="energy-lbl">Gesamt:</span><span class="energy-total">' + total + '</span></div>' +
      '</div></div>';
  }

  function buildCamera(w) {
    var idx = w.deviceIdx;
    var src = '/api/domoticz/camera/' + idx + '/snapshot?t=' + Date.now();
    return '<div class="widget widget-camera" data-widget-id="' + w.id +
      '" data-idx="' + idx +
      '" data-type="camera">' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<img class="cam-img" src="' + src + '" alt="Kamera" />' +
      '<span class="widget-unit cam-ts">Live</span>' +
      '</div>';
  }

  function buildSensor(w, s) {
    var val = '\u2014';
    var ic  = iconForState(s);
    if (s) {
      if (s.Temp !== undefined && s.Humidity !== undefined) {
        val = s.Temp + '\u00b0C  ' + s.Humidity + '%';
      } else if (s.Temp !== undefined) {
        val = s.Temp + '\u00b0C';
      } else {
        val = s.Data || s.Status || '\u2014';
      }
    }
    return '<div class="widget"' +
      ' data-widget-id="' + w.id + '"' +
      ' data-idx="' + w.deviceIdx + '"' +
      ' data-type="sensor">' +
      '<span class="widget-icon">' + ic + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value">' + escHtml(String(val)) + '</span>' +
      '</div>';
  }

  function buildContact(w, s) {
    var isOpen = s && (s.Status === 'Open' || s.Status === 'On');
    var sw = (s && s.SwitchType ? s.SwitchType : '').toLowerCase();
    var isDoor = sw.indexOf('door') >= 0;
    var ic = isOpen ? (isDoor ? '&#128682;' : '&#128167;') : (isDoor ? '&#128274;' : '&#9989;');
    var label = isOpen ? (isDoor ? 'OFFEN' : 'ALARM') : (isDoor ? 'GESCHLOSSEN' : 'OK');
    return '<div class="widget' + (isOpen ? ' widget-on' : '') +
      '" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="contact">' +
      '<span class="widget-icon">' + ic + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value ' + (isOpen ? 'contact-open' : 'contact-closed') + '">' + label + '</span>' +
      '</div>';
  }

  function buildMotion(w, s) {
    var active = s && s.Status === 'On';
    return '<div class="widget' + (active ? ' widget-on' : '') +
      '" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="motion">' +
      '<span class="widget-icon">' + (active ? '&#127939;' : '&#129508;') + '</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value ' + (active ? 'contact-open' : 'contact-closed') + '">' +
      (active ? 'BEWEGT' : 'FREI') + '</span>' +
      '</div>';
  }

  function buildButtonWidget(w, s) {
    return '<div class="widget" data-widget-id="' + w.id +
      '" data-idx="' + w.deviceIdx +
      '" data-type="button">' +
      '<span class="widget-icon">&#128280;</span>' +
      '<span class="widget-name">' + escHtml(w.deviceName) + '</span>' +
      '<span class="widget-value">DR\xdcCKEN</span>' +
      '</div>';
  }

  // ── Energy value parsers ──────────────────────────────────────
  function parseWatt(str) {
    if (!str) return '\u2014';
    var m = String(str).match(/([\d.]+)/);
    if (!m) return String(str);
    var v = parseFloat(m[1]);
    return v >= 1000 ? (v / 1000).toFixed(2) + ' kW' : v + ' W';
  }

  function parseKwh(str) {
    if (!str) return '\u2014';
    var m = String(str).match(/([\d.]+)/);
    if (!m) return String(str);
    return parseFloat(m[1]).toFixed(3) + ' kWh';
  }

  // ── Widget Events ─────────────────────────────────────────────
  function bindWidgetEvents() {
    var $area = $('#widgets-area');

    // Switch ON/OFF
    $area.off('click.sw').on('click.sw', '[data-type="switch"] .sw-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var btn = $(this), idx = btn.closest('[data-idx]').data('idx'), cmd = btn.data('cmd');
      ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'switchlight', idx: idx, switchcmd: cmd }, function () { resetAutoReturn(); });
    });

    // RGB ON/OFF
    $area.off('click.rgbsw').on('click.rgbsw', '[data-type="rgb"] .sw-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var btn = $(this), idx = btn.closest('[data-idx]').data('idx'), cmd = btn.data('cmd');
      ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'switchlight', idx: idx, switchcmd: cmd }, function () { resetAutoReturn(); });
    });

    // RGB color swatch
    $area.off('click.rgbc').on('click.rgbc', '[data-type="rgb"] .rgb-swatch', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var swatch = $(this), idx = swatch.closest('[data-idx]').data('idx');
      var hex = swatch.data('color').replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);
      ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'setcolbrightnessvalue', idx: idx, color: JSON.stringify({ m: 3, r: r, g: g, b: b, t: 0, cw: 0, ww: 0 }), brightness: 100 }, function () {});
    });

    // RGB brightness
    $area.off('input.rgbl').on('input.rgbl', '[data-type="rgb"] .rgb-level', function () {
      var el = $(this), val = parseInt(el.val(), 10), idx = el.closest('[data-idx]').data('idx');
      clearTimeout(el.data('timer'));
      el.data('timer', setTimeout(function () {
        ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'switchlight', idx: idx, switchcmd: 'Set Level', level: val }, function () {});
      }, 400));
    });

    // Scene trigger
    $area.off('click.scene').on('click.scene', '[data-type="scene"]', function (e) {
      e.stopPropagation();
      var idx = $(this).data('idx');
      ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'switchscene', idx: idx, switchcmd: 'On' }, function () {});
    });

    // Dimmer
    $area.off('input.dim').on('input.dim', '[data-type="dimmer"] .dim-slider', function () {
      var el = $(this), val = parseInt(el.val(), 10), widget = el.closest('[data-idx]'), idx = widget.data('idx');
      widget.find('.dim-val').text(val + '%');
      clearTimeout(el.data('timer'));
      el.data('timer', setTimeout(function () {
        var cmd = val > 0 ? 'Set Level' : 'Off';
        ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'switchlight', idx: idx, switchcmd: cmd, level: val }, function () {});
      }, 400));
    });

    // Push button
    $area.off('click.btn').on('click.btn', '[data-type="button"]', function (e) {
      e.stopPropagation();
      var idx = $(this).data('idx');
      var self = $(this);
      self.css('opacity', '0.5');
      ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'switchlight', idx: idx, switchcmd: 'On' }, function () {
        setTimeout(function () { self.css('opacity', ''); }, 400);
      }, function () { self.css('opacity', ''); });
    });

    // Blinds
    $area.off('click.bl').on('click.bl', '[data-type="blinds"] .blind-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var idx = $(this).closest('[data-idx]').data('idx'), cmd = $(this).data('cmd');
      ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'switchlight', idx: idx, switchcmd: cmd }, function () {});
    });

    // Thermostat
    $area.off('click.th').on('click.th', '[data-type="thermostat"] .thermo-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var btn = $(this), widget = btn.closest('[data-type="thermostat"]');
      var idx = widget.data('idx');
      var sp = parseFloat(widget.data('setpoint')) || 20;
      var isUp = btn.hasClass('thermo-up');
      sp = Math.round((sp + (isUp ? 0.5 : -0.5)) * 10) / 10;
      widget.data('setpoint', sp);
      widget.find('.thermo-val').html(sp.toFixed(1) + '&#176;');
      ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'setsetpoint', idx: idx, setpoint: sp }, function () {});
    });
  }

  // ── Polling ───────────────────────────────────────────────────
  function startPolling() {
    var interval = settings.pollInterval || 3000;
    pollDevices();
    pollTimer = setInterval(pollDevices, interval);
  }

  function pollDevices() {
    ajaxGet('/api/domoticz/json.htm',
      { type: 'command', param: 'getdevices', used: 'true', displayhidden: '0' },
      function (res) {
        if (res && res.result) {
          for (var i = 0; i < res.result.length; i++) {
            deviceStates[String(res.result[i].idx)] = res.result[i];
          }
        }
        $('#conn-dot').attr('class', 'dot-online');
        updateWidgetValues();
      },
      function () {
        $('#conn-dot').attr('class', 'dot-offline');
      }
    );
  }

  function updateWidgetValues() {
    $('#widgets-area [data-idx]').each(function () {
      var el = $(this);
      var idx = String(el.data('idx'));
      var type = String(el.data('type') || '');
      var state = deviceStates[idx];

      if (type === 'camera') return; // camera uses its own timer

      if (!state) return;

      if (type === 'switch') {
        var on = state.Status === 'On';
        el.toggleClass('widget-on', on);
        el.find('.widget-value').text(on ? 'AN' : 'AUS');
        el.find('.sw-btn[data-cmd="On"]').toggleClass('sw-btn-on', on);

      } else if (type === 'dimmer') {
        var level = parseInt(state.Level, 10) || 0;
        var dimOn = level > 0 || state.Status === 'On';
        el.toggleClass('widget-on', dimOn);
        el.find('.dim-val').text(level + '%');
        // Only update slider if not currently being dragged
        if (!el.find('.dim-slider').is(':active')) {
          el.find('.dim-slider').val(level);
        }

      } else if (type === 'rgb') {
        var rgbOn = state.Status === 'On';
        el.toggleClass('widget-on', rgbOn);
        el.find('.sw-btn[data-cmd="On"]').toggleClass('sw-btn-on', rgbOn);

      } else if (type === 'contact') {
        var isOpen = state.Status === 'Open' || state.Status === 'On';
        var swt = (state.SwitchType || '').toLowerCase();
        var isDoor = swt.indexOf('door') >= 0;
        var label = isOpen ? (isDoor ? 'OFFEN' : 'ALARM') : (isDoor ? 'GESCHLOSSEN' : 'OK');
        el.toggleClass('widget-on', isOpen);
        el.find('.widget-value').text(label)
          .toggleClass('contact-open', isOpen)
          .toggleClass('contact-closed', !isOpen);

      } else if (type === 'motion') {
        var active = state.Status === 'On';
        el.toggleClass('widget-on', active);
        el.find('.widget-value').text(active ? 'BEWEGT' : 'FREI')
          .toggleClass('contact-open', active)
          .toggleClass('contact-closed', !active);

      } else if (type === 'blinds') {
        el.find('.widget-value').text(state.Status || '\u2014');

      } else if (type === 'thermostat') {
        // Only update setpoint if user is not interacting
        var sp = parseFloat(state.SetPoint);
        if (!isNaN(sp)) {
          el.data('setpoint', sp);
          el.find('.thermo-val').html(sp.toFixed(1) + '&#176;');
        }
        if (state.Temp !== undefined) {
          el.find('.widget-unit').text('Ist: ' + state.Temp + '\u00b0C');
        }

      } else if (type === 'energy') {
        el.find('.energy-watt').text(parseWatt(state.Usage));
        el.find('.energy-today').text(parseKwh(state.CounterToday));
        el.find('.energy-total').text(parseKwh(state.Data));

      } else {
        // sensor / default
        var val;
        if (state.Temp !== undefined && state.Humidity !== undefined) {
          val = state.Temp + '\u00b0C  ' + state.Humidity + '%';
        } else if (state.Temp !== undefined) {
          val = state.Temp + '\u00b0C';
        } else {
          val = state.Data || state.Status || '\u2014';
        }
        el.find('.widget-value').text(val);
        el.find('.widget-icon').html(iconForState(state));
      }
    });
  }

  // ── Navigation ────────────────────────────────────────────────
  function goToPage(idx) {
    if (idx < 0 || idx >= pagesData.pages.length) return;
    currentPage = idx;
    renderCurrentPage();
    resetAutoReturn();
  }

  function bindEvents() {
    // Nav arrows
    $(document).on('click', '#btn-prev', function (e) { e.preventDefault(); goToPage(currentPage - 1); });
    $(document).on('click', '#btn-next', function (e) { e.preventDefault(); goToPage(currentPage + 1); });

    // Page dots
    $(document).on('click', '.p-dot', function () { goToPage(parseInt($(this).data('idx'), 10)); });

    // Touch swipe
    $('body').on('touchstart', function (e) {
      touchStartX = e.originalEvent.touches[0].clientX;
    });
    $('body').on('touchend', function (e) {
      var dx = e.originalEvent.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) goToPage(currentPage + 1);
        else        goToPage(currentPage - 1);
      }
    });

    // Fullscreen toggle
    $(document).on('click', '#fullscreen-btn', function (e) {
      e.preventDefault();
      var el = document.documentElement;
      var isFs = document.fullscreenElement || document.webkitFullscreenElement ||
                 document.mozFullScreenElement || document.msFullscreenElement;
      if (isFs) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      } else {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
        else if (el.msRequestFullscreen) el.msRequestFullscreen();
      }
    });
    function updateFullscreenIcon() {
      var isFs = document.fullscreenElement || document.webkitFullscreenElement ||
                 document.mozFullScreenElement || document.msFullscreenElement;
      $('#fullscreen-btn').html(isFs ? '&#x2715;' : '&#9974;');
    }
    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
    document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
    document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

    // Settings open / close
    $(document).on('click', '#settings-btn', function (e) {
      e.preventDefault();
      populateSettingsForms();
      $('#settings-panel').show();
      clearTimeout(autoReturnTimer);
    });
    $(document).on('click', '#settings-close', function (e) {
      e.preventDefault();
      $('#settings-panel').hide();
      resetAutoReturn();
    });

    // Save connection
    $(document).on('click', '#btn-save-conn', function () {
      settings.domoticz = {
        host:     $('#cfg-host').val(),
        port:     parseInt($('#cfg-port').val(), 10) || 8080,
        ssl:      $('#cfg-ssl').is(':checked'),
        username: $('#cfg-user').val(),
        password: $('#cfg-pass').val()
      };
      ajaxPost('/api/settings', settings, function () {
        showTestResult('Gespeichert \u2713', 'ok');
      }, function () {
        showTestResult('Fehler beim Speichern', 'error');
      });
    });

    // Test connection
    $(document).on('click', '#btn-test', function () {
      showTestResult('Verbinde\u2026', '');
      ajaxGet('/api/domoticz/json.htm', { type: 'command', param: 'getversion' }, function (res) {
        if (res && res.status === 'OK') showTestResult('&#x2713; Verbunden \u2014 Domoticz ' + (res.version || ''), 'ok');
        else showTestResult('&#x2717; Fehler', 'error');
      }, function (err) {
        showTestResult('&#x2717; ' + (err || 'Fehler'), 'error');
      });
    });

    // Load devices (including cameras from separate endpoint)
    $(document).on('click', '#btn-add-spacer', function () {
      var pageId = $('#cfg-target-page').val();
      if (!pageId) { alert('Bitte Seite ausw\xe4hlen.'); return; }
      ajaxPost('/api/pages/' + pageId + '/widgets',
        { deviceIdx: null, deviceName: 'Leerfeld', deviceType: 'spacer' },
        function () {
          ajaxGet('/api/pages', {}, function (data) {
            pagesData = data;
            renderCurrentPage();
          });
        }
      );
    });

    $(document).on('click', '#btn-load-devices', function () {
      var cat = $('#cfg-category').val();
      var pageId = $('#cfg-target-page').val();
      $('#devices-list').html('<div class="loading-msg">Lade\u2026</div>');

      // Collect already-added widget idxs across all pages
      var addedIdxs = {};
      var p, ww;
      for (p = 0; p < pagesData.pages.length; p++) {
        for (ww = 0; ww < pagesData.pages[p].widgets.length; ww++) {
          addedIdxs[String(pagesData.pages[p].widgets[ww].deviceIdx)] = true;
        }
      }

      if (cat === 'camera') {
        // Load cameras from separate endpoint
        loadCameraList(function () {
          renderDeviceList(cameraList, 'camera', addedIdxs, pageId);
        });
        return;
      }

      ajaxGet('/api/domoticz/json.htm',
        { type: 'command', param: 'getdevices', used: 'true', displayhidden: '0' },
        function (res) {
          var devices = (res && res.result) ? res.result : [];
          if (cat !== 'all') {
            devices = filterByCategory(devices, cat);
          }
          renderDeviceList(devices, null, addedIdxs, pageId);
        },
        function () {
          $('#devices-list').html('<div style="color:#ff4444;font-size:11px">Verbindungsfehler</div>');
        }
      );
    });

    // Add device button (event delegation)
    $(document).on('click', '.btn-add-dev', function (e) {
      e.preventDefault();
      var btn = $(this);
      var pageId = $('#cfg-target-page').val();
      if (!pageId) { alert('Bitte Seite w\xe4hlen.'); return; }
      btn.text('...').prop('disabled', true);
      ajaxPost('/api/pages/' + pageId + '/widgets', {
        deviceIdx:  btn.data('idx'),
        deviceName: btn.data('name'),
        deviceType: btn.data('type')
      }, function () {
        btn.closest('.dev-item').find('.btn-add-dev').replaceWith('<span class="dev-added">hinzugef\xfcgt</span>');
        loadPages(function () {
          renderCurrentPage();
          updatePagesMgmtList();
        });
      }, function () {
        btn.text('+ Add').prop('disabled', false);
      });
    });

    // Add new page
    $(document).on('click', '#btn-add-page', function () {
      var name = prompt('Seitenname:', 'Neue Seite');
      if (!name) return;
      ajaxPost('/api/pages', { name: name }, function () {
        loadPages(function () {
          renderPageDots();
          updatePagesMgmtList();
          populatePageDropdowns();
        });
      });
    });

    // Delete page (event delegation on pages-mgmt-list)
    $(document).on('click', '.page-del-btn', function (e) {
      e.preventDefault();
      var id = $(this).data('page-id');
      var name = $(this).data('page-name');
      if (!confirm('Seite "' + name + '" wirklich l\xf6schen?')) return;
      ajaxDelete('/api/pages/' + id, function () {
        loadPages(function () {
          if (currentPage >= pagesData.pages.length) currentPage = Math.max(0, pagesData.pages.length - 1);
          renderPageDots();
          renderCurrentPage();
          updatePagesMgmtList();
          populatePageDropdowns();
        });
      });
    });

    // Theme change
    $(document).on('change', '#cfg-theme', function () {
      var theme = $(this).val();
      settings.theme = theme;
      applyTheme(theme);
      ajaxPost('/api/settings', settings, function () {}, function () {});
    });

    // Save automation
    $(document).on('click', '#btn-save-auto', function () {
      settings.autoReturnTimeout = parseInt($('#cfg-auto-return').val(), 10) || 30;
      settings.homePage = $('#cfg-home-page').val() || null;
      settings.nightMode = {
        enabled:    $('#cfg-night-mode').prop('checked'),
        startTime:  $('#cfg-night-start').val() || '22:00',
        endTime:    $('#cfg-night-end').val()   || '06:00',
        brightness: parseInt($('#cfg-night-brightness').val(), 10) || 30
      };
      ajaxPost('/api/settings', settings, function () {
        alert('Gespeichert \u2713');
        startAutoReturn();
        startNightMode();
      });
    });
  }

  // ── Render device list in settings ───────────────────────────
  function renderDeviceList(devices, forceType, addedIdxs, pageId) {
    if (!devices || devices.length === 0) {
      $('#devices-list').html('<div style="color:#444466;font-size:11px">Keine Ger\xe4te gefunden.</div>');
      return;
    }
    var html = '';
    for (var i = 0; i < devices.length; i++) {
      var d = devices[i];
      var idx = String(d.idx);
      var dname = d.Name || d.name || '';
      var dtype = forceType || matchType(d);
      var added = !!addedIdxs[idx];
      html += '<div class="dev-item">' +
        (added
          ? '<span class="dev-added">hinzugef\xfcgt</span>'
          : '<a href="#" class="btn-add-dev"' +
            ' data-idx="' + escAttr(idx) + '"' +
            ' data-name="' + escAttr(dname) + '"' +
            ' data-type="' + escAttr(dtype) + '">+ Add</a>') +
        '<div class="dev-name">' + escHtml(dname) + '</div>' +
        '<div class="dev-type">' + escHtml(d.Type || dtype) + '</div>' +
        '</div>';
    }
    $('#devices-list').html(html);
  }

  // ── Category filtering ────────────────────────────────────────
  function filterByCategory(devices, cat) {
    return $.grep(devices, function (d) {
      var type = (d.Type || '').toLowerCase();
      var sub  = (d.SubType || '').toLowerCase();
      var sw   = (d.SwitchType || '').toLowerCase();
      if (cat === 'switch')     return (type.indexOf('light') >= 0 || type.indexOf('switch') >= 0) && sw.indexOf('dimmer') < 0 && sub.indexOf('rgb') < 0;
      if (cat === 'dimmer')     return sw.indexOf('dimmer') >= 0 && sub.indexOf('rgb') < 0;
      if (cat === 'rgb')        return sub.indexOf('rgb') >= 0 || sub.indexOf('rgbw') >= 0;
      if (cat === 'temp')       return type.indexOf('temp') >= 0 && type.indexOf('hum') < 0;
      if (cat === 'hum')        return type.indexOf('hum') >= 0 && type.indexOf('temp') < 0;
      if (cat === 'thermostat') return type.indexOf('thermostat') >= 0 || sw.indexOf('setpoint') >= 0;
      if (cat === 'blinds')     return sw.indexOf('blind') >= 0 || sw.indexOf('venetian') >= 0 || sw.indexOf('shutter') >= 0;
      if (cat === 'scene')      return type === 'scene' || type === 'group';
      if (cat === 'energy')     return type.indexOf('p1') >= 0 || sub.indexOf('kwh') >= 0 || type.indexOf('usage') >= 0;
      return true; // 'all'
    });
  }

  function matchType(d) {
    var type = (d.Type || '').toLowerCase();
    var sub  = (d.SubType || '').toLowerCase();
    var sw   = (d.SwitchType || '').toLowerCase();
    if (type === 'scene' || type === 'group')                       return 'scene';
    if (sw.indexOf('blind') >= 0 || sw.indexOf('venetian') >= 0 || sw.indexOf('shutter') >= 0) return 'blinds';
    if (sub.indexOf('rgb') >= 0)                                    return 'rgb';
    if (sw.indexOf('dimmer') >= 0)                                  return 'dimmer';
    if (sw.indexOf('door contact') >= 0 || sw === 'contact')        return 'contact';
    if (sw.indexOf('motion sensor') >= 0 || sw === 'motion')        return 'motion';
    if (sw.indexOf('push on') >= 0 || sw.indexOf('push off') >= 0)  return 'button';
    if (type.indexOf('thermostat') >= 0 || sub === 'setpoint')      return 'thermostat';
    if (type.indexOf('p1') >= 0 || sub === 'kwh')                   return 'energy';
    if (type.indexOf('light') >= 0 || type.indexOf('switch') >= 0)  return 'switch';
    return 'sensor';
  }

  // ── Settings form helpers ─────────────────────────────────────
  function populateSettingsForms() {
    if (settings.domoticz) {
      $('#cfg-host').val(settings.domoticz.host || '');
      $('#cfg-port').val(settings.domoticz.port || 8080);
      $('#cfg-ssl').prop('checked', !!settings.domoticz.ssl);
      $('#cfg-user').val(settings.domoticz.username || '');
      $('#cfg-pass').val(settings.domoticz.password || '');
    }
    $('#cfg-theme').val(settings.theme || 'cyberpunk');
    $('#cfg-auto-return').val(settings.autoReturnTimeout || 30);
    var nm = settings.nightMode || {};
    $('#cfg-night-mode').prop('checked', !!nm.enabled);
    $('#cfg-night-start').val(nm.startTime || '22:00');
    $('#cfg-night-end').val(nm.endTime || '06:00');
    $('#cfg-night-brightness').val(nm.brightness !== undefined ? nm.brightness : 30);
    populatePageDropdowns();
    updatePagesMgmtList();
  }

  function populatePageDropdowns() {
    var $tp = $('#cfg-target-page');
    var $hp = $('#cfg-home-page');
    $tp.empty();
    $hp.html('<option value="">-- keine --</option>');
    for (var i = 0; i < pagesData.pages.length; i++) {
      var p = pagesData.pages[i];
      $tp.append('<option value="' + p.id + '">' + escHtml(p.name) + '</option>');
      $hp.append('<option value="' + p.id + '"' +
        (p.id === settings.homePage ? ' selected="selected"' : '') +
        '>' + escHtml(p.name) + '</option>');
    }
  }

  function updatePagesMgmtList() {
    var html = '';
    for (var i = 0; i < pagesData.pages.length; i++) {
      var p = pagesData.pages[i];
      html += '<div class="page-mgmt-item">' +
        '<span class="page-mgmt-name">' + escHtml(p.name) + '</span>' +
        '<a href="#" class="page-del-btn"' +
        ' data-page-id="' + escAttr(p.id) + '"' +
        ' data-page-name="' + escAttr(p.name) + '">\u2715</a>' +
        '</div>';
    }
    $('#pages-mgmt-list').html(html || '<div style="color:#444466;font-size:11px">Keine Seiten.</div>');
  }

  // ── Auto-Return ───────────────────────────────────────────────
  function startAutoReturn() { resetAutoReturn(); }

  function resetAutoReturn() {
    clearTimeout(autoReturnTimer);
    var timeout = (settings.autoReturnTimeout || 30) * 1000;
    if (!timeout || !settings.homePage) return;
    autoReturnTimer = setTimeout(function () {
      var homeIdx = -1;
      for (var i = 0; i < pagesData.pages.length; i++) {
        if (pagesData.pages[i].id === settings.homePage) { homeIdx = i; break; }
      }
      if (homeIdx >= 0 && homeIdx !== currentPage) goToPage(homeIdx);
    }, timeout);
  }

  // ── Night Mode ────────────────────────────────────────────────
  function startNightMode() {
    clearInterval(nightModeTimer);
    checkNightMode();
    nightModeTimer = setInterval(checkNightMode, 60000);
  }

  function checkNightMode() {
    var nm = settings.nightMode || {};
    if (!nm.enabled) { document.body.style.filter = ''; return; }
    var now = new Date();
    var cur = now.getHours() * 60 + now.getMinutes();
    var startParts = (nm.startTime || '22:00').split(':');
    var endParts   = (nm.endTime   || '06:00').split(':');
    var start = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
    var end   = parseInt(endParts[0],   10) * 60 + parseInt(endParts[1],   10);
    var isNight = (start > end) ? (cur >= start || cur < end) : (cur >= start && cur < end);
    var brightness = nm.brightness !== undefined ? nm.brightness : 30;
    document.body.style.filter = isNight ? 'brightness(' + (brightness / 100) + ')' : '';
  }

  // ── Helpers ───────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escAttr(str) { return escHtml(str); }

  function showTestResult(msg, cls) {
    var el = $('#test-result');
    el.html(msg);
    el.attr('class', cls === 'ok' ? 'result-ok' : (cls === 'error' ? 'result-error' : ''));
  }

})(jQuery);
