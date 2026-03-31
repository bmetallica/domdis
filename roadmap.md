# Domoticz Cyberpunk Dashboard — Roadmap

## Projektübersicht
Tablet-optimiertes (10") Web-Dashboard für Domoticz, Node.js/Express Backend,
Cyberpunk-Ästhetik, mehrere Themes, Legacy-Kompatibilitätsmodus.

---

## Themes
| ID           | Name           | Farben                        |
|--------------|----------------|-------------------------------|
| cyberpunk    | Cyberpunk 2077 | Neon-Pink #ff2d78, Cyan #00f5ff, Schwarz #0a0a0f |
| matrix       | Matrix         | Grün #00ff41, Schwarz #000000 |
| bladerunner  | Blade Runner   | Amber #ff6b35, Dunkelblau #0d0d2b |
| tron         | TRON Legacy    | Elektro-Blau #00b4d8, Schwarz #000814 |
| retrowave    | Synthwave      | Lila #7700ff, Pink #ff00ff, Dunkel #0d0221 |

---

## Phasen

### Phase 1 — Backend & Grundstruktur ✅
- [x] package.json mit Dependencies
- [x] server.js (Express, statische Dateien, Routing)
- [x] routes/proxy.js (Domoticz API Proxy mit Auth)
- [x] routes/settings.js (Settings & Pages API)
- [x] config/settings.json (Standardkonfiguration)
- [x] config/pages.json (Seitenkonfiguration)

### Phase 2 — Modernes Frontend ✅
- [x] public/index.html (Haupt-SPA Shell)
- [x] public/css/base.css (Layout, Grid, Animationen)
- [x] public/css/themes/cyberpunk.css
- [x] public/css/themes/matrix.css
- [x] public/css/themes/bladerunner.css
- [x] public/css/themes/tron.css
- [x] public/css/themes/retrowave.css
- [x] public/js/api.js (HTTP-Kommunikation Backend/Domoticz)
- [x] public/js/widgets.js (Widget-Renderer für alle Gerätetypen)
- [x] public/js/app.js (Haupt-App: Seiten, Swipe, Polling, Auto-Return)

### Phase 3 — Einstellungsseite ✅
- [x] Verbindungseinstellungen (IP, Port, User, Passwort, SSL)
- [x] Theme-Auswahl (5 Themes als Karten)
- [x] Seitenverwaltung (hinzufügen, löschen, Home-Seite setzen)
- [x] Geräteverwaltung (nach Kategorie filtern, Seite zuweisen)
- [x] Nacht-Modus Zeitsteuerung
- [x] Slideshow-Modus
- [x] Auto-Return Timeout

### Phase 4 — Kompatibilitätsmodus ✅
- [x] public/compat.html (ES5-kompatible SPA Shell)
- [x] public/css/compat.css (Table-Layout, keine modernen CSS-Features)
- [x] public/js/compat.js (ES5, jQuery 1.x, XHR-Polling)

---

## Geräteklassen (Domoticz)
| Klasse         | Widget-Typ      | Funktionen                    |
|----------------|-----------------|-------------------------------|
| Light/Switch   | SwitchWidget    | Ein/Aus Toggle                |
| Dimmer         | DimmerWidget    | Ein/Aus + Schieberegler       |
| Temperature    | SensorWidget    | Wert + Einheit anzeigen       |
| Humidity       | SensorWidget    | Luftfeuchte anzeigen          |
| Temp+Hum       | SensorWidget    | Kombiniert                    |
| Thermostat     | ThermostatWidget| Soll-Temp +/- Tasten          |
| Wind           | SensorWidget    | Windstärke + Richtung         |
| Rain           | SensorWidget    | Regenmenge                    |
| UV             | SensorWidget    | UV-Index                      |
| Barometer      | SensorWidget    | Luftdruck                     |
| Blinds/Shutters| BlindWidget     | Auf/Stop/Zu                   |
| Scene          | SceneWidget     | Szene auslösen                |
| Group          | SceneWidget     | Gruppe Ein/Aus                |
| Security       | SensorWidget    | Status anzeigen               |
| Energy/Power   | EnergyWidget    | Verbrauch kWh/W               |
| RGB/RGBW       | RGBWidget       | Farbe + Helligkeit            |
| Camera         | CameraWidget    | MJPEG Stream                  |

---

## Extra Features
- Uhr + Datum immer im Header sichtbar
- Auto-Return zur Home-Seite (Standard 30s, konfigurierbar)
- Slideshow-Modus (Seiten automatisch durchschalten)
- Nacht-Modus (Helligkeit nach Uhrzeit reduzieren)
- Offline-Indikator (Verbindungsstatus Domoticz)
- Glitch-Animation Effekte (Cyberpunk Theme)
- Wischgesten (Touch & Mouse Swipe)
- Drag & Drop Widget-Positionierung (Edit-Modus)
- Vollbild-Unterstützung (Fullscreen API)

---

## Kompatibilitätsmodus Details
URL: `/?compat=1` oder direkt `/compat`

Unterstützte Altsysteme:
- Android 4.0–4.4 (Chrome 18+, Android Browser)
- Windows Vista/7 (IE9+, alter Chrome/Firefox)
- iPad mini 1. Gen (iOS 5–6, Safari)

Technische Einschränkungen:
- Kein ES6 (var statt let/const, keine Arrow Functions, keine Template Literals)
- Kein CSS Grid / Flexbox → Table-basiertes Layout
- jQuery 1.11 für DOM-Manipulation (CDN mit Fallback)
- XMLHttpRequest statt fetch()
- HTTP-Polling alle 3s statt WebSocket
- Keine CSS Custom Properties (--variablen)
- Keine CSS Transitions/Animations
- Kein Fullscreen API

---

## Status: IN BEARBEITUNG
Zuletzt aktualisiert: 2026-03-31
