# DOMDIS — Domoticz Dashboard

> A cyberpunk-styled, tablet-optimised smart home dashboard for [Domoticz](https://www.domoticz.com/).  
> Built with Node.js/Express · Five themes · All device classes · Compat mode for legacy devices.

---

## Features

| Feature | Details |
|---|---|
| **5 Themes** | Cyberpunk 2077, Matrix, Blade Runner, TRON Legacy, Synthwave |
| **Device classes** | Switch, Dimmer, RGB, Sensor, Thermostat, Blinds, Scene, Energy meter, Camera |
| **Swipeable pages** | Unlimited pages, touch/swipe, keyboard arrows, page dots |
| **Edit mode** | Drag & drop widgets, per-widget display type, scalable widget sizes |
| **Camera live view** | Snapshot proxy (credentials stay server-side, 5-min cache) |
| **Energy monitoring** | Real-time watt + today/total kWh, 1-second polling |
| **Night mode** | Scheduled screen dimming |
| **Slideshow** | Auto-rotate pages on a configurable interval |
| **Auto-return** | Return to home page after inactivity |
| **Compat mode** | `/compat` — ES5, jQuery 1.11, table layout for Android 4 / IE9 / iOS 5 |

---

## Screenshots

> Open the dashboard at `http://<host>:<port>/` and the compat version at `http://<host>:<port>/compat`.

---

## Requirements

- **Domoticz** 2024.x or newer (tested with 2026.1)  
- **Docker** 20+ (recommended) **or** Node.js 18+

---

## Installation

### Option A — Docker (recommended)

#### 1. Pull the image

```bash
docker pull bmetallica/domdis:latest
```


#### 2. Create your working directory

```bash
mkdir -p ~/domdis/config
cd ~/domdis
```

#### 3. Download docker-compose.yml

```bash
curl -O https://raw.githubusercontent.com/<your-user>/domdis/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/<your-user>/domdis/main/.env.example
cp .env.example .env
```

Or copy `docker-compose.yml` and `.env.example` from this repository manually.

#### 4. Configure the port (optional)

Edit `.env`:

```env
DOMDIS_PORT=3001   # host port — change to any free port
```

#### 5. Start

```bash
docker compose up -d
```

The dashboard is now available at `http://<host>:3001` (or your chosen port).

---

### Option B — Manual / Systemd (Debian/Ubuntu)

```bash
# 1. Clone
git clone https://github.com/<your-user>/domdis.git /opt/domdis
cd /opt/domdis

# 2. Install dependencies
npm ci --omit=dev

# 3. Install service
cp domdis.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now domdis

# 4. Check status
systemctl status domdis
```

The systemd unit uses `PORT=3001` by default. Edit `/etc/systemd/system/domdis.service` to change it, then `systemctl daemon-reload && systemctl restart domdis`.

---

## First Steps

### 1. Open the dashboard

Navigate to `http://<ip>:<port>/` in your browser (Chrome, Firefox, Safari).  
For older devices (Android 4, iPad mini 1st gen, Windows Vista/7): `http://<ip>:<port>/compat`

### 2. Open Settings

Click the **⚙** gear icon in the top-right corner.

### 3. Enter your Domoticz connection

Go to the **Verbindung** tab:

| Field | Example |
|---|---|
| Host / IP | `192.168.1.100` |
| Port | `8080` |
| SSL | off (unless you have a reverse proxy with TLS) |
| Benutzername | your Domoticz username (leave blank if auth is disabled) |
| Passwort | your Domoticz password |

Click **Verbindung testen** — you should see ✓ with the Domoticz version.  
Click **Speichern**.

### 4. Create pages

Go to **Seiten** → **+ Seite hinzufügen** — give each page a name (e.g. "Living Room", "Garden").

### 5. Add devices

Go to **Geräte**:
1. Select a **Kategorie** to filter device types
2. Select the **Ziel-Seite** (target page)
3. Click **Geräte laden**
4. Click **+ Add** next to each device you want on the dashboard

### 6. Choose a theme

Go to **Aussehen** and pick a theme. The change applies instantly.

### 7. Set a home page (optional)

Go to **Automation**:
- **Home-Seite**: the page to return to automatically
- **Auto-Return**: seconds of inactivity before returning (0 = off)
- **Nacht-Modus**: dim the screen between two times
- **Slideshow**: auto-rotate pages

### 8. Edit mode

Click the **✏** pencil button (or press `E`) to enter edit mode:
- **Drag & drop** widgets to reorder them
- Click **⚙** on a widget to change its **display type** and **size**
- Click **🗑** to remove a widget from the page

---

## Widget Display Types

| Device | Available types |
|---|---|
| Switch / Lamp | Card, Large, Button, Minimal |
| Dimmer | Card, Circular dial, Vertical slider, Minimal |
| RGB light | Card, Colour palette, Minimal |
| Sensor (temp/hum/…) | Card, Gauge, Large, Minimal |
| Energy meter | Card, Detailed (W + kWh), Flow, Minimal |
| Thermostat | Card, Circular dial |
| Blinds / Shutters | Card, Shutter visual, Minimal |
| Scene / Group | Card, Large button |
| Camera | Live view, Overlay, Minimal |

---

## Widget Sizes

Widgets can be resized in edit mode:

| Size | Grid span |
|---|---|
| 1×1 | default |
| 2×1 | double width |
| 1×2 | double height |
| 2×2 | 2× wide, 2× tall |
| 3×1 | triple width |

---

## Compatibility Mode (`/compat`)

Reachable at `/compat` or `/?compat=1`.  
Designed for:
- Android 4.x (stock browser, Chrome 35)
- iPad mini 1st generation (iOS 5/6, Safari)
- Windows Vista / 7 (IE9, IE10)
- Any browser without ES6 or CSS Grid support

Features available in compat mode: all device types, live camera snapshots, theme selection, page management, auto-return, and settings — using only ES5 JavaScript and table-based layout.

---

## Configuration Reference

`config/settings.json` is the persistent config file.  
When running in Docker, mount a host directory as `/app/config` (see `docker-compose.yml`).

```json
{
  "domoticz": {
    "host": "192.168.1.100",
    "port": 8080,
    "ssl": false,
    "username": "",
    "password": ""
  },
  "theme": "cyberpunk",
  "autoReturnTimeout": 30,
  "homePage": null,
  "nightMode": {
    "enabled": false,
    "startTime": "22:00",
    "endTime": "06:00",
    "brightness": 30
  },
  "slideshowMode": {
    "enabled": false,
    "interval": 10
  },
  "pollInterval": 3000
}
```

`config/pages.json` stores all pages and widget assignments. This file is written automatically by the settings UI — no manual editing required.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/settings` | Read settings |
| POST | `/api/settings` | Write settings |
| GET | `/api/pages` | Read all pages + widgets |
| POST | `/api/pages` | Add a page |
| DELETE | `/api/pages/:id` | Delete a page |
| POST | `/api/pages/:id/widgets` | Add widget to page |
| DELETE | `/api/pages/:pageId/widgets/:widgetId` | Remove widget |
| POST | `/api/pages/:id/reorder` | Reorder widgets |
| GET | `/api/domoticz/json.htm` | Proxy to Domoticz JSON API |
| GET | `/api/domoticz/cameras` | List cameras (no credentials exposed) |
| GET | `/api/domoticz/camera/:idx/snapshot` | Proxy camera snapshot image |

---



## Project Structure

```
domdis/
├── server.js               Express entry point
├── routes/
│   ├── proxy.js            Domoticz API proxy
│   └── settings.js         Settings & pages CRUD
├── public/
│   ├── index.html          Modern dashboard
│   ├── compat.html         Legacy / compat dashboard
│   ├── css/
│   │   ├── base.css        Grid layout, widget styles
│   │   ├── compat.css      Table layout + all 5 themes
│   │   └── themes/         cyberpunk / matrix / bladerunner / tron / retrowave
│   └── js/
│       ├── api.js          Domoticz API calls
│       ├── widgets.js      Widget renderers (modern)
│       ├── app.js          App logic, edit mode, settings
│       └── compat.js       All-in-one ES5 compat script
├── config/
│   ├── settings.json       Runtime config (persisted)
│   ├── pages.json          Pages & widgets (persisted)
│   └── defaults/           Default configs baked into Docker image
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## License

MIT — feel free to use, modify, and distribute.
