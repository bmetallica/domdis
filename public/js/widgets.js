/* ═══════════════════════════════════════════════════════════════
   DOMDIS — Widget Renderers  v2
   Display types + size support per device class
   ═══════════════════════════════════════════════════════════════ */

const Widgets = (function () {

  // ── Display type catalogue ─────────────────────────────────────
  const DISPLAY_TYPES = {
    switch: [
      { id: 'card',    label: 'Karte',     icon: '▣' },
      { id: 'button',  label: 'Button',    icon: '⬤' },
      { id: 'large',   label: 'Groß',      icon: '⬛' },
      { id: 'minimal', label: 'Minimal',   icon: '▬' }
    ],
    dimmer: [
      { id: 'card',     label: 'Karte',    icon: '▣' },
      { id: 'circular', label: 'Dial',     icon: '◉' },
      { id: 'vertical', label: 'Vertikal', icon: '↕' },
      { id: 'minimal',  label: 'Minimal',  icon: '▬' }
    ],
    rgb: [
      { id: 'card',    label: 'Karte',     icon: '▣' },
      { id: 'palette', label: 'Palette',   icon: '🎨' },
      { id: 'minimal', label: 'Minimal',   icon: '▬' }
    ],
    sensor: [
      { id: 'card',    label: 'Karte',     icon: '▣' },
      { id: 'gauge',   label: 'Gauge',     icon: '◔' },
      { id: 'large',   label: 'Groß',      icon: '⬛' },
      { id: 'minimal', label: 'Minimal',   icon: '▬' }
    ],
    energy: [
      { id: 'card',     label: 'Karte',       icon: '▣' },
      { id: 'detailed', label: 'Detailliert', icon: '📊' },
      { id: 'flow',     label: 'Fluss',       icon: '⚡' },
      { id: 'minimal',  label: 'Minimal',     icon: '▬' }
    ],
    thermostat: [
      { id: 'card',     label: 'Karte',    icon: '▣' },
      { id: 'circular', label: 'Dial',     icon: '◉' }
    ],
    blinds: [
      { id: 'card',    label: 'Karte',     icon: '▣' },
      { id: 'shutter', label: 'Jalousie',  icon: '🪟' },
      { id: 'minimal', label: 'Minimal',   icon: '▬' }
    ],
    contact: [
      { id: 'card',    label: 'Karte',   icon: '▣' },
      { id: 'minimal', label: 'Minimal', icon: '▬' }
    ],
    motion: [
      { id: 'card',    label: 'Karte',   icon: '▣' },
      { id: 'minimal', label: 'Minimal', icon: '▬' }
    ],
    button: [
      { id: 'card',  label: 'Karte', icon: '▣' },
      { id: 'large', label: 'Groß',  icon: '⬛' }
    ],
    scene: [
      { id: 'card',  label: 'Karte',       icon: '▣' },
      { id: 'large', label: 'Groß',        icon: '⬛' }
    ],
    camera: [
      { id: 'live',      label: 'Live-Bild', icon: '📷' },
      { id: 'overlay',   label: 'Mit Label', icon: '🔲' },
      { id: 'minimal',   label: 'Minimal',   icon: '▬' }
    ]
  };

  // ── Size definitions ──────────────────────────────────────────
  const SIZES = [
    { id: '1x1', label: '1×1', cols: 1, rows: 1 },
    { id: '2x1', label: '2×1', cols: 2, rows: 1 },
    { id: '1x2', label: '1×2', cols: 1, rows: 2 },
    { id: '2x2', label: '2×2', cols: 2, rows: 2 },
    { id: '3x1', label: '3×1', cols: 3, rows: 1 }
  ];

  function getSizes() { return SIZES; }
  function getDisplayTypes(t) { return DISPLAY_TYPES[t] || [{ id: 'card', label: 'Karte', icon: '▣' }]; }

  function applySize(el, size) {
    if (!size || size === '1x1') return;
    el.classList.add('ws-' + size);
  }

  // ── Device classification ─────────────────────────────────────
  function classifyDevice(device) {
    const type   = (device.Type       || '').toLowerCase();
    const sub    = (device.SubType    || '').toLowerCase();
    const swType = (device.SwitchType || '').toLowerCase();
    if (type === 'scene' || type === 'group') return 'scene';
    if (swType.includes('blinds') || swType.includes('venetian') || type.includes('blinds')) return 'blinds';
    if (swType.includes('dimmer') || type.includes('dimmer')) return 'dimmer';
    if (sub.includes('rgb') || sub.includes('ww')) return 'rgb';
    if (type.includes('thermostat') || sub.includes('setpoint')) return 'thermostat';
    if (sub === 'kwh' || type.includes('p1 smart meter') || type.includes('youless') || sub.includes('energy')) return 'energy';
    if (swType.includes('door contact'))                              return 'contact';
    if (swType === 'contact')                                         return 'contact';
    if (swType.includes('motion sensor') || swType === 'motion')     return 'motion';
    if (swType.includes('push on') || swType.includes('push off'))   return 'button';
    if (type.includes('temp') || type.includes('humidity') || type.includes('wind') ||
        type.includes('rain') || type.includes('uv') || type.includes('baro') ||
        type.includes('lux') || type.includes('air quality') || type.includes('rfxmeter')) return 'sensor';
    if (type.includes('light') || type.includes('switch')) return 'switch';
    return 'sensor';
  }

  function getIcon(wType, deviceType, subType, switchType) {
    const map = {
      switch:'💡', dimmer:'🔆', rgb:'🌈', blinds:'🪟', thermostat:'🌡',
      scene:'🎬', energy:'⚡', camera:'📷', sensor:'📊',
      contact:'🚪', motion:'🏃', button:'🔘'
    };
    const dt = (deviceType  || '').toLowerCase();
    const st = (subType     || '').toLowerCase();
    const sw = (switchType  || '').toLowerCase();
    // SwitchType-based (most specific)
    if (sw.includes('door contact'))              return '🚪';
    if (sw === 'contact')                         return '💧';
    if (sw.includes('motion sensor'))             return '🏃';
    if (sw.includes('push on') || sw.includes('push off')) return '🔘';
    // Device Type-based
    if (dt.includes('temp'))                      return '🌡';
    if (dt.includes('hum'))                       return '💧';
    if (dt.includes('wind'))                      return '💨';
    if (dt.includes('rain'))                      return '🌧';
    if (dt.includes('uv'))                        return '☀️';
    if (dt.includes('baro'))                      return '🔵';
    if (dt.includes('lux'))                       return '☀️';
    if (dt.includes('air quality'))               return '🌬️';
    if (dt.includes('rfxmeter'))                  return '💧';
    // SubType-based (for General devices)
    if (st.includes('voc'))                       return '🌬️';
    if (st === 'percentage')                      return '🔋';
    if (st === 'voltage')                         return '🔌';
    if (st === 'distance')                        return '📏';
    if (st.includes('custom sensor'))             return '🌫️';
    if (st === 'gas')                             return '🔥';
    return map[wType] || '📟';
  }

  // ── Main render ───────────────────────────────────────────────
  function render(widget, deviceState) {
    const wType = widget.deviceType || (deviceState ? classifyDevice(deviceState) : 'sensor');
    const dType = widget.displayType || 'card';

    // Cameras have no regular device state — render anyway
    if (wType === 'camera') {
      const el = renderCamera(widget, deviceState, dType);
      applySize(el, widget.size);
      return el;
    }

    if (!deviceState) {
      const el = renderOffline(widget);
      applySize(el, widget.size);
      return el;
    }

    // Auto-upgrade legacy 'switch' widgets that are really contact/motion/button
    if (wType === 'switch') {
      const real = classifyDevice(deviceState);
      if (real === 'contact' || real === 'motion' || real === 'button') wType = real;
    }

    let el;
    switch (wType) {
      case 'switch':     el = renderSwitch(widget, deviceState, dType);     break;
      case 'dimmer':     el = renderDimmer(widget, deviceState, dType);     break;
      case 'rgb':        el = renderRGB(widget, deviceState, dType);        break;
      case 'blinds':     el = renderBlinds(widget, deviceState, dType);     break;
      case 'thermostat': el = renderThermostat(widget, deviceState, dType); break;
      case 'scene':      el = renderScene(widget, deviceState, dType);      break;
      case 'energy':     el = renderEnergy(widget, deviceState, dType);     break;
      case 'contact':    el = renderContact(widget, deviceState, dType);    break;
      case 'motion':     el = renderMotion(widget, deviceState, dType);     break;
      case 'button':     el = renderButton(widget, deviceState, dType);     break;
      default:           el = renderSensor(widget, deviceState, dType);     break;
    }
    applySize(el, widget.size);
    return el;
  }

  function makeEl(widget, extra) {
    const el = document.createElement('div');
    el.className = 'widget' + (extra ? ' ' + extra : '');
    el.dataset.widgetId   = widget.id;
    el.dataset.deviceIdx  = widget.deviceIdx;
    el.dataset.widgetType = widget.deviceType;
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // SWITCH
  // ══════════════════════════════════════════════════════════════
  function renderSwitch(widget, state, dType) {
    const isOn = state.Status === 'On';
    const el   = makeEl(widget, isOn ? 'on' : 'off');
    const icon = getIcon('switch', state.Type, state.SubType, state.SwitchType);

    if (dType === 'button') {
      el.classList.add('widget-btn-style');
      el.innerHTML = `
        <div class="power-btn ${isOn ? 'power-on' : ''}">⏻</div>
        <div class="widget-name">${widget.deviceName}</div>`;
    } else if (dType === 'large') {
      el.classList.add('widget-large');
      el.innerHTML = `
        <div class="widget-icon-lg">${icon}</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-state-badge ${isOn ? 'badge-on' : 'badge-off'}">${isOn ? 'AN' : 'AUS'}</div>`;
    } else if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `
        <span class="widget-name">${widget.deviceName}</span>
        <span class="mini-status ${isOn ? 'badge-on' : 'badge-off'}">${isOn ? 'AN' : 'AUS'}</span>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">${icon}</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-value">${isOn ? 'AN' : 'AUS'}</div>`;
    }

    el.addEventListener('click', async () => {
      el.style.opacity = '0.6';
      try { await API.setSwitch(widget.deviceIdx, !isOn); }
      finally { el.style.opacity = ''; }
    });
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // DIMMER
  // ══════════════════════════════════════════════════════════════
  function renderDimmer(widget, state, dType) {
    const isOn  = state.Status === 'On' || parseInt(state.Level) > 0;
    const level = parseInt(state.Level) || 0;
    const el    = makeEl(widget, isOn ? 'on' : 'off');

    if (dType === 'circular') {
      el.classList.add('widget-circular');
      el.innerHTML = `
        <div class="widget-name">${widget.deviceName}</div>
        <div class="circular-dial-wrap">
          ${dialSVG(level, 100)}
          <div class="dial-value">${level}%</div>
        </div>
        <input type="range" min="0" max="100" value="${level}" class="dimmer-slider">`;
    } else if (dType === 'vertical') {
      el.classList.add('widget-vertical');
      el.innerHTML = `
        <div class="widget-name">${widget.deviceName}</div>
        <div class="vertical-slider-wrap">
          <span class="vert-label top">100%</span>
          <input type="range" min="0" max="100" value="${level}" class="dimmer-slider vert-slider">
          <span class="vert-label bot">0%</span>
        </div>
        <div class="widget-value dim-val">${level}%</div>`;
    } else if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `
        <span class="widget-name">${widget.deviceName}</span>
        <input type="range" min="0" max="100" value="${level}" class="dimmer-slider mini-range">
        <span class="mini-status">${level}%</span>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">🔆</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="dimmer-control">
          <div class="widget-value dim-val">${level}%</div>
          <input type="range" min="0" max="100" value="${level}" class="dimmer-slider">
        </div>`;
    }

    bindDimmerEvents(el, widget, isOn, level, dType);
    return el;
  }

  function bindDimmerEvents(el, widget, isOn, initLevel, dType) {
    const slider = el.querySelector('.dimmer-slider');
    let timer;
    slider.addEventListener('input', () => {
      const v = parseInt(slider.value);
      const valEl = el.querySelector('.dim-val, .dial-value, .mini-status');
      if (valEl) valEl.textContent = v + '%';
      updateDial(el, v, 100);
      clearTimeout(timer);
      timer = setTimeout(() => API.setDimmer(widget.deviceIdx, v), 300);
    });
    slider.addEventListener('click', e => e.stopPropagation());
    el.addEventListener('click', e => {
      if (e.target === slider) return;
      API.setSwitch(widget.deviceIdx, !isOn);
    });
  }

  // ══════════════════════════════════════════════════════════════
  // RGB
  // ══════════════════════════════════════════════════════════════
  function renderRGB(widget, state, dType) {
    const isOn  = state.Status === 'On';
    const color = parseColor(state.Color);
    const level = parseInt(state.Level) || 100;
    const el    = makeEl(widget, isOn ? 'on' : 'off');

    if (dType === 'palette') {
      el.classList.add('widget-palette');
      const presets = ['#ff0000','#ff6600','#ffff00','#00ff00','#00ffff','#0066ff','#9900ff','#ff00ff','#ffffff','#ffaa00'];
      el.innerHTML = `
        <div class="widget-name">${widget.deviceName}</div>
        <div class="palette-swatches">
          ${presets.map(c => `<div class="swatch" style="background:${c}" data-color="${c}"></div>`).join('')}
        </div>
        <div class="rgb-controls">
          <input type="color" value="${color}" class="rgb-picker" title="Farbe">
          <input type="range" min="0" max="100" value="${level}" class="dimmer-slider" style="flex:1">
          <span class="mini-status">${level}%</span>
        </div>`;
      el.querySelectorAll('.swatch').forEach(sw => {
        sw.addEventListener('click', e => {
          e.stopPropagation();
          const {h, s} = hexToHSV(sw.dataset.color);
          API.setRGBColor(widget.deviceIdx, h, s, level);
        });
      });
    } else if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `
        <span class="widget-name">${widget.deviceName}</span>
        <input type="color" value="${color}" class="rgb-picker">
        <span class="mini-status ${isOn ? 'badge-on' : 'badge-off'}">${isOn ? 'AN' : 'AUS'}</span>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon" style="color:${color}">🌈</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-value">${isOn ? 'AN' : 'AUS'}</div>
        <div class="rgb-controls">
          <input type="color" value="${color}" class="rgb-picker">
          <input type="range" min="0" max="100" value="${level}" class="dimmer-slider" style="flex:1">
        </div>`;
    }

    const picker = el.querySelector('.rgb-picker');
    const slider = el.querySelector('.dimmer-slider');
    if (picker) {
      picker.addEventListener('change', e => { e.stopPropagation(); const {h,s}=hexToHSV(picker.value); API.setRGBColor(widget.deviceIdx, h, s, slider?parseInt(slider.value):100); });
      picker.addEventListener('click', e => e.stopPropagation());
    }
    if (slider) {
      slider.addEventListener('input', e => { e.stopPropagation(); const {h,s}=hexToHSV(picker?picker.value:'#ffffff'); API.setRGBColor(widget.deviceIdx, h, s, parseInt(slider.value)); });
      slider.addEventListener('click', e => e.stopPropagation());
    }
    el.addEventListener('click', () => API.setSwitch(widget.deviceIdx, !isOn));
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // SENSOR
  // ══════════════════════════════════════════════════════════════
  function renderSensor(widget, state, dType) {
    const el   = makeEl(widget, 'sensor');
    const icon = getIcon('sensor', state.Type, state.SubType, state.SwitchType);
    const lines = buildSensorLines(state);

    if (dType === 'gauge') {
      el.classList.add('widget-gauge');
      const { gaugeVal, gaugeMin, gaugeMax, gaugeUnit } = extractGaugeData(state);
      const pct = Math.min(100, Math.max(0, ((gaugeVal - gaugeMin) / (gaugeMax - gaugeMin)) * 100));
      el.innerHTML = `
        <div class="widget-name">${widget.deviceName}</div>
        <div class="gauge-wrap">
          ${gaugeSVG(pct, gaugeVal, gaugeUnit)}
        </div>
        ${lines.length > 1 ? `<div class="widget-unit">${lines.slice(1).join(' · ')}</div>` : ''}`;
    } else if (dType === 'large') {
      el.classList.add('widget-large');
      el.innerHTML = `
        <div class="widget-icon-lg">${icon}</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="sensor-large-val">${lines[0] || '—'}</div>
        ${lines.slice(1).map(l => `<div class="widget-value" style="font-size:0.9rem">${l}</div>`).join('')}`;
    } else if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `
        <span class="widget-name">${widget.deviceName}</span>
        <span class="mini-status">${lines[0] || '—'}</span>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">${icon}</div>
        <div class="widget-name">${widget.deviceName}</div>
        ${lines.map(l => `<div class="widget-value">${l}</div>`).join('')}`;
    }
    return el;
  }

  function buildSensorLines(state) {
    const lines = [];
    if (state.Temp     !== undefined) lines.push(`${state.Temp} °C`);
    if (state.Humidity !== undefined) lines.push(`${state.Humidity}% RH`);
    if (state.Barometer!== undefined) lines.push(`${state.Barometer} hPa`);
    if (!lines.length) lines.push(state.Data || state.Status || '—');
    return lines;
  }

  function extractGaugeData(state) {
    const type = (state.Type || '').toLowerCase();
    if (state.Temp !== undefined) return { gaugeVal: parseFloat(state.Temp), gaugeMin: -20, gaugeMax: 50, gaugeUnit: '°C' };
    if (state.Humidity !== undefined) return { gaugeVal: parseFloat(state.Humidity), gaugeMin: 0, gaugeMax: 100, gaugeUnit: '%' };
    if (type.includes('uv')) return { gaugeVal: parseFloat(state.Data) || 0, gaugeMin: 0, gaugeMax: 12, gaugeUnit: 'UV' };
    const num = parseFloat(state.Data);
    return { gaugeVal: isNaN(num) ? 0 : num, gaugeMin: 0, gaugeMax: 100, gaugeUnit: '' };
  }

  function gaugeSVG(pct, value, unit) {
    // Semicircle arc, cx=50, cy=54, r=38
    const arcLen = 119.4; // π*38
    const fill   = arcLen * pct / 100;
    return `<svg viewBox="0 0 100 58" class="gauge-svg">
      <path d="M 12 54 A 38 38 0 0 1 88 54" fill="none" stroke-width="7" class="gauge-track"/>
      <path d="M 12 54 A 38 38 0 0 1 88 54" fill="none" stroke-width="7" class="gauge-fill"
        stroke-dasharray="${fill.toFixed(1)} ${arcLen}" stroke-linecap="round"/>
      <text x="50" y="50" text-anchor="middle" class="gauge-val-text">${value}</text>
      <text x="50" y="57" text-anchor="middle" class="gauge-unit-text">${unit}</text>
    </svg>`;
  }

  // ══════════════════════════════════════════════════════════════
  // ENERGY
  // ══════════════════════════════════════════════════════════════
  function renderEnergy(widget, state, dType) {
    const el       = makeEl(widget, 'sensor');
    const watt     = parseWatt(state.Usage);
    const totalKwh = parseKwh(state.Data);
    const todayKwh = parseKwh(state.CounterToday);
    const isGas    = (state.SubType || '').toLowerCase().includes('gas');

    if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `
        <span class="widget-name">${widget.deviceName}</span>
        <span class="mini-status">${isGas ? (state.Data||'—') : (watt !== null ? watt + ' W' : (totalKwh||'—') + ' kWh')}</span>`;
      return el;
    }

    if (dType === 'flow') {
      el.classList.add('widget-energy-flow');
      const isProducing = watt !== null && watt < 0;
      const absW = watt !== null ? Math.abs(watt) : 0;
      el.innerHTML = `
        <div class="widget-name">${widget.deviceName}</div>
        <div class="flow-display ${isProducing ? 'flow-produce' : 'flow-consume'}">
          <div class="flow-icon">${isProducing ? '☀️' : '⚡'}</div>
          <div class="flow-watt">${absW} <span class="widget-unit">W</span></div>
          <div class="flow-dir">${isProducing ? '↑ Einspeisung' : '↓ Verbrauch'}</div>
        </div>
        ${todayKwh !== null ? `<div class="energy-sub">Heute: ${todayKwh} kWh</div>` : ''}`;
      return el;
    }

    if (dType === 'detailed') {
      el.classList.add('widget-energy-detailed');
      const pct = watt !== null ? Math.min(100, Math.round((Math.abs(watt) / 3000) * 100)) : 0;
      el.innerHTML = `
        <div class="widget-icon">⚡</div>
        <div class="widget-name">${widget.deviceName}</div>
        ${watt !== null ? `
          <div class="energy-row">
            <span class="energy-label">Aktuell</span>
            <span class="energy-val-main">${watt} <span class="widget-unit">W</span></span>
          </div>
          <div class="energy-bar-wrap"><div class="energy-bar" style="width:${pct}%"></div></div>` : ''}
        ${todayKwh !== null ? `<div class="energy-row"><span class="energy-label">Heute</span><span class="energy-val">${todayKwh} kWh</span></div>` : ''}
        ${totalKwh !== null ? `<div class="energy-row"><span class="energy-label">Gesamt</span><span class="energy-val">${totalKwh} kWh</span></div>` : ''}
        ${isGas ? `<div class="widget-value">${state.Data}</div>` : ''}`;
      return el;
    }

    // Default card
    el.innerHTML = `
      <div class="widget-icon">⚡</div>
      <div class="widget-name">${widget.deviceName}</div>
      ${watt     !== null ? `<div class="energy-now"><span class="energy-watt">${watt}</span> <span class="widget-unit">W</span></div>` : ''}
      ${todayKwh !== null ? `<div class="energy-sub">Heute: ${todayKwh} kWh</div>` : ''}
      ${totalKwh !== null ? `<div class="energy-sub">Gesamt: ${totalKwh} kWh</div>` : ''}
      ${isGas    ?          `<div class="widget-value">${state.Data}</div>` : ''}`;
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // THERMOSTAT
  // ══════════════════════════════════════════════════════════════
  function renderThermostat(widget, state, dType) {
    const el  = makeEl(widget, '');
    const sp  = parseFloat(state.SetPoint || state.Temp || 20);
    const cur = state.Temp !== undefined ? parseFloat(state.Temp) : null;

    if (dType === 'circular') {
      el.classList.add('widget-circular');
      el.innerHTML = `
        <div class="widget-name">${widget.deviceName}</div>
        <div class="circular-dial-wrap">
          ${dialSVG(sp - 5, 25, 'thermo-fill')}
          <div class="dial-value thermo-sp">${sp.toFixed(1)}°</div>
        </div>
        ${cur !== null ? `<div class="widget-unit">Ist: ${cur.toFixed(1)} °C</div>` : ''}
        <div class="thermo-controls">
          <button class="thermo-btn thermo-down">−</button>
          <button class="thermo-btn thermo-up">+</button>
        </div>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">🌡</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="thermo-controls">
          <button class="thermo-btn thermo-down">−</button>
          <div class="widget-value thermo-val">${sp.toFixed(1)}°</div>
          <button class="thermo-btn thermo-up">+</button>
        </div>
        ${cur !== null ? `<div class="widget-unit">Ist: ${cur.toFixed(1)} °C</div>` : ''}`;
    }

    let current = sp;
    el.querySelector('.thermo-up').addEventListener('click', async e => {
      e.stopPropagation();
      current = Math.round((current + 0.5) * 10) / 10;
      const v = el.querySelector('.thermo-val, .thermo-sp');
      if (v) v.textContent = current.toFixed(1) + '°';
      updateDialThermo(el, current);
      await API.setThermostat(widget.deviceIdx, current);
    });
    el.querySelector('.thermo-down').addEventListener('click', async e => {
      e.stopPropagation();
      current = Math.round((current - 0.5) * 10) / 10;
      const v = el.querySelector('.thermo-val, .thermo-sp');
      if (v) v.textContent = current.toFixed(1) + '°';
      updateDialThermo(el, current);
      await API.setThermostat(widget.deviceIdx, current);
    });
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // BLINDS
  // ══════════════════════════════════════════════════════════════
  function renderBlinds(widget, state, dType) {
    const el     = makeEl(widget, '');
    const status = state.Status || '—';
    const level  = parseInt(state.Level) || 0; // 0=open 100=closed for some drivers

    if (dType === 'shutter') {
      el.classList.add('widget-shutter');
      const closedPct = Math.min(100, Math.max(0, level));
      el.innerHTML = `
        <div class="widget-name">${widget.deviceName}</div>
        <div class="shutter-visual">
          <div class="shutter-frame">
            ${Array.from({length:6}).map((_,i) => {
              const slat_pct = Math.min(100, Math.max(0, (closedPct - i*16.6)));
              return `<div class="shutter-slat" style="opacity:${0.3 + slat_pct/100*0.7}"></div>`;
            }).join('')}
          </div>
          <div class="shutter-pct">${status}</div>
        </div>
        <div class="blind-controls">
          <button class="blind-btn blind-open" title="Öffnen">▲</button>
          <button class="blind-btn blind-stop" title="Stop">■</button>
          <button class="blind-btn blind-close" title="Schließen">▼</button>
        </div>`;
    } else if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `
        <span class="widget-name">${widget.deviceName}</span>
        <span>
          <a href="#" class="mini-btn blind-open">▲</a>
          <a href="#" class="mini-btn blind-stop">■</a>
          <a href="#" class="mini-btn blind-close">▼</a>
        </span>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">🪟</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-value">${status}</div>
        <div class="blind-controls">
          <button class="blind-btn blind-open" title="Öffnen">▲</button>
          <button class="blind-btn blind-stop" title="Stop">■</button>
          <button class="blind-btn blind-close" title="Schließen">▼</button>
        </div>`;
    }

    ['open','stop','close'].forEach(cmd => {
      const b = el.querySelector(`.blind-${cmd}`);
      if (b) b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); API.setBlinds(widget.deviceIdx, cmd.charAt(0).toUpperCase()+cmd.slice(1)); });
    });
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // SCENE
  // ══════════════════════════════════════════════════════════════
  function renderScene(widget, state, dType) {
    const isOn    = state.Status === 'On';
    const isGroup = (state.Type || '').toLowerCase() === 'group';
    const el      = makeEl(widget, isOn ? 'on' : 'off');

    if (dType === 'large') {
      el.classList.add('widget-large');
      el.innerHTML = `
        <div class="widget-icon-lg">${isGroup ? '🔗' : '🎬'}</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-state-badge ${isGroup?(isOn?'badge-on':'badge-off'):'badge-trigger'}">${isGroup?(isOn?'AN':'AUS'):'AUSLÖSEN'}</div>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">${isGroup ? '🔗' : '🎬'}</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-value">${isGroup?(isOn?'AN':'AUS'):'AUSLÖSEN'}</div>`;
    }
    el.addEventListener('click', async () => {
      el.style.opacity = '0.6';
      try {
        if (isGroup) await API.triggerScene(widget.deviceIdx, isOn?'Off':'On');
        else { await API.triggerScene(widget.deviceIdx,'On'); el.classList.add('on'); setTimeout(()=>el.classList.remove('on'),800); }
      } finally { el.style.opacity = ''; }
    });
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // CAMERA
  // ══════════════════════════════════════════════════════════════
  function renderCamera(widget, state, dType) {
    const el = makeEl(widget, 'sensor');

    if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `<span class="widget-name">${widget.deviceName}</span><span class="mini-status">📷</span>`;
      return el;
    }

    el.classList.add('widget-camera');
    const name = widget.deviceName;

    // Use a unique random string so the img doesn't share cache with other cameras
    const rand = Math.random().toString(36).slice(2);
    el.innerHTML = `
      <div class="camera-wrap">
        <img class="camera-img" data-src="/api/domoticz/camera/${widget.deviceIdx}/snapshot"
             src="/api/domoticz/camera/${widget.deviceIdx}/snapshot?t=${rand}"
             alt="${name}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="camera-err" style="display:none">📷 ${name}<br><small>Nicht verfügbar</small></div>
      </div>
      ${dType === 'overlay' ? `<div class="camera-label">${name}</div>` : ''}`;

    // Auto-refresh every 5s
    const img = el.querySelector('.camera-img');
    if (img) {
      el._camTimer = setInterval(() => {
        if (!document.contains(el)) { clearInterval(el._camTimer); return; }
        const t = Date.now();
        const base = img.dataset.src;
        img.src = base + '?t=' + t;
      }, 5000);
    }
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // CONTACT (Tür/Fenster/Flood-Sensoren) — read-only
  // ══════════════════════════════════════════════════════════════
  function renderContact(widget, state, dType) {
    const isOpen  = state.Status === 'Open' || state.Status === 'On';
    const sw      = (state.SwitchType || '').toLowerCase();
    const isDoor  = sw.includes('door');
    const icon    = isOpen ? (isDoor ? '🚪' : '💧') : (isDoor ? '🔒' : '✅');
    const label   = isOpen ? (isDoor ? 'OFFEN' : 'ALARM') : (isDoor ? 'GESCHLOSSEN' : 'OK');
    const el      = makeEl(widget, isOpen ? 'on contact-widget' : 'contact-widget');

    if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `
        <span class="widget-name">${widget.deviceName}</span>
        <span class="mini-status ${isOpen ? 'contact-open' : 'contact-closed'}">${label}</span>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">${icon}</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-value ${isOpen ? 'contact-open' : 'contact-closed'}">${label}</div>`;
    }
    return el; // read-only — no click handler
  }

  // ══════════════════════════════════════════════════════════════
  // MOTION SENSOR — read-only
  // ══════════════════════════════════════════════════════════════
  function renderMotion(widget, state, dType) {
    const active = state.Status === 'On';
    const el     = makeEl(widget, active ? 'on' : '');

    if (dType === 'minimal') {
      el.classList.add('widget-minimal');
      el.innerHTML = `
        <span class="widget-name">${widget.deviceName}</span>
        <span class="mini-status ${active ? 'contact-open' : 'contact-closed'}">${active ? 'BEWEGT' : 'FREI'}</span>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">${active ? '🏃' : '🧘'}</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-value ${active ? 'contact-open' : 'contact-closed'}">${active ? 'BEWEGT' : 'FREI'}</div>`;
    }
    return el; // read-only — no click handler
  }

  // ══════════════════════════════════════════════════════════════
  // PUSH BUTTON — triggers On command
  // ══════════════════════════════════════════════════════════════
  function renderButton(widget, state, dType) {
    const el = makeEl(widget, '');

    if (dType === 'large') {
      el.classList.add('widget-large');
      el.innerHTML = `
        <div class="widget-icon-lg">🔘</div>
        <div class="widget-name">${widget.deviceName}</div>`;
    } else {
      el.innerHTML = `
        <div class="widget-icon">🔘</div>
        <div class="widget-name">${widget.deviceName}</div>
        <div class="widget-value">DRÜCKEN</div>`;
    }
    el.addEventListener('click', async () => {
      el.classList.add('on');
      el.style.opacity = '0.5';
      try { await API.setSwitch(widget.deviceIdx, true); }
      finally { setTimeout(() => { el.classList.remove('on'); el.style.opacity = ''; }, 400); }
    });
    return el;
  }

  // ══════════════════════════════════════════════════════════════
  // OFFLINE
  // ══════════════════════════════════════════════════════════════
  function renderOffline(widget) {
    const el = makeEl(widget, 'offline');
    el.style.opacity = '0.35';
    el.innerHTML = `<div class="widget-icon">📟</div><div class="widget-name">${widget.deviceName}</div><div class="widget-value">—</div>`;
    return el;
  }

  // ── SVG helpers ───────────────────────────────────────────────
  function dialSVG(val, max, extraClass) {
    const pct  = Math.min(100, Math.max(0, (val / max) * 100));
    const dash = Math.round(pct * 2.01);
    const cls  = extraClass ? ' ' + extraClass : '';
    return `<svg class="circular-dial" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="32" fill="none" stroke-width="6" class="dial-track"/>
      <circle cx="40" cy="40" r="32" fill="none" stroke-width="6" class="dial-fill${cls}"
        stroke-dasharray="${dash} 201" stroke-dashoffset="50" stroke-linecap="round"/>
    </svg>`;
  }

  function updateDial(el, val, max) {
    const fill = el.querySelector('.dial-fill');
    if (!fill) return;
    fill.setAttribute('stroke-dasharray', `${Math.round((val/max)*100*2.01)} 201`);
  }

  function updateDialThermo(el, sp) {
    updateDial(el, sp - 5, 25);
  }

  // ── Value parsers ─────────────────────────────────────────────
  function parseWatt(val) {
    if (val === undefined || val === null) return null;
    const s = String(val);
    const m = s.match(/([-\d.]+)\s*[Ww]att/) || (s.match(/^([-\d.]+)$/) && !s.includes('kWh') ? s.match(/^([-\d.]+)$/) : null);
    return m ? Math.round(parseFloat(m[1])) : null;
  }

  function parseKwh(val) {
    if (!val) return null;
    const m = String(val).match(/([\d.]+)\s*kWh/);
    return m ? parseFloat(m[1]).toFixed(3) : null;
  }

  function parseColor(c) {
    if (!c || typeof c !== 'object') return '#ffffff';
    return '#' + [c.r||0, c.g||0, c.b||0].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  function hexToHSV(hex) {
    const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    let h=0;
    if(d){if(max===r)h=((g-b)/d+6)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=Math.round(h*60);}
    return {h, s:max?Math.round((d/max)*100):0};
  }

  return {
    render, classifyDevice, getIcon,
    getDisplayTypes, getSizes,
    parseWatt, parseKwh
  };
})();
