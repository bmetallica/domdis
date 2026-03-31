# DOMDIS — Vollständige Anleitung

> **DOMDIS** ist ein webbasiertes Smart-Home-Dashboard für [Domoticz](https://www.domoticz.com/),
> optimiert für 10″-Tablets, aber nutzbar auf jedem Gerät mit einem Browser —
> vom modernen Smartphone bis zum Tablet mit Windows Vista und Internet Explorer 9.

---

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Installation via Docker](#2-installation-via-docker)
3. [Installation ohne Docker (manuell)](#3-installation-ohne-docker-manuell)
4. [Erster Start & Verbindung zu Domoticz](#4-erster-start--verbindung-zu-domoticz)
5. [Seiten anlegen](#5-seiten-anlegen)
6. [Geräte hinzufügen](#6-geräte-hinzufügen)
7. [Gerätetypen und Darstellungsarten](#7-gerätetypen-und-darstellungsarten)
8. [Bearbeitungsmodus](#8-bearbeitungsmodus)
9. [Themes (Designs)](#9-themes-designs)
10. [Automation](#10-automation)
11. [Kompatibilitätsmodus für alte Geräte](#11-kompatibilitätsmodus-für-alte-geräte)
12. [Kamera-Livebild](#12-kamera-livebild)
13. [Fehlerbehebung](#13-fehlerbehebung)
14. [Verzeichnisstruktur](#14-verzeichnisstruktur)

---

## 1. Voraussetzungen

| Komponente | Mindestversion |
|---|---|
| Domoticz | 2024.x oder neuer |
| Docker + Docker Compose | 20.x / v2 (empfohlen) |
| **oder** Node.js | 18.x oder neuer |
| Browser (modern) | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| Browser (Compat-Modus) | IE 9+, Chrome 35+, Android 4.x, iOS 5+ |

DOMDIS läuft vollständig im lokalen Netzwerk. Es wird keine Cloud-Verbindung benötigt.

---

## 2. Installation via Docker

Docker ist der empfohlene Weg, da keine Node.js-Installation nötig ist und
Einstellungen sicher als Volume gespeichert werden.

### 2.1 Arbeitsverzeichnis anlegen

```bash
mkdir -p ~/domdis/config
cd ~/domdis
```

### 2.2 docker-compose.yml herunterladen

Datei `docker-compose.yml` aus dem Repository kopieren oder direkt erstellen:

```yaml
services:
  domdis:
    image: 192.168.66.12:5000/bmetallica/domdis:latest
    container_name: domdis
    restart: unless-stopped
    ports:
      - "${DOMDIS_PORT:-3001}:3001"
    environment:
      - PORT=3001
    volumes:
      - ./config:/app/config
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### 2.3 Port anpassen (optional)

Datei `.env` im selben Verzeichnis anlegen:

```env
DOMDIS_PORT=3001
```

Den Wert auf einen freien Port deines Servers ändern.

### 2.4 Container starten

```bash
docker compose up -d
```

Beim ersten Start werden automatisch leere Standard-Konfigurationsdateien in
`./config/` angelegt. Der Container ist danach unter
`http://<server-ip>:<port>/` erreichbar.

### 2.5 Logs prüfen

```bash
docker compose logs -f
```

Erwartete Ausgabe beim ersten Start:
```
[domdis] First start: copying default settings.json
[domdis] First start: copying default pages.json
Domdis Dashboard running on http://localhost:3001
```

### 2.6 Image aus lokalem Registry

Das Image liegt im lokalen Registry unter `192.168.66.12:5000`.
Falls Docker beim Pull einen HTTPS-Fehler meldet, einmalig als root ausführen:

```bash
# /etc/docker/daemon.json anpassen:
echo '{"insecure-registries":["192.168.66.12:5000"]}' > /etc/docker/daemon.json
systemctl restart docker
```

### 2.7 Container aktualisieren

```bash
docker compose pull
docker compose down && docker compose up -d
```

Die Einstellungen in `./config/` bleiben dabei erhalten.

---

## 3. Installation ohne Docker (manuell)

### 3.1 Repository klonen

```bash
git clone https://github.com/bmetallica/domdis.git /opt/domdis
cd /opt/domdis
```

### 3.2 Abhängigkeiten installieren

```bash
npm ci --omit=dev
```

### 3.3 Als Systemdienst einrichten (Debian / Ubuntu)

```bash
cp domdis.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now domdis
```

Port und weitere Parameter in der Service-Datei anpassen:

```ini
# /etc/systemd/system/domdis.service
Environment=PORT=3001
```

Nach Änderungen:

```bash
systemctl daemon-reload
systemctl restart domdis
```

### 3.4 Status prüfen

```bash
systemctl status domdis
# oder manuell starten:
node server.js
```

---

## 4. Erster Start & Verbindung zu Domoticz

### 4.1 Dashboard aufrufen

Browser öffnen und folgende Adresse eingeben:

```
http://<IP-des-Servers>:3001/
```

Beispiel: `http://192.168.1.50:3001/`

Das Dashboard erscheint im Cyberpunk-Design mit einer leeren Startseite.

### 4.2 Einstellungen öffnen

Auf das **⚙ Zahnrad-Symbol** oben rechts tippen.

Das Einstellungs-Panel öffnet sich mit fünf Reitern:
**Verbindung · Aussehen · Seiten · Geräte · Automation**

### 4.3 Domoticz-Verbindung konfigurieren

Reiter **„Verbindung"** auswählen und folgende Felder ausfüllen:

| Feld | Beschreibung | Beispiel |
|---|---|---|
| Host / IP | IP-Adresse oder Hostname des Domoticz-Servers | `192.168.1.100` |
| Port | Port von Domoticz (Standard: 8080) | `8080` |
| SSL | Einschalten wenn Domoticz hinter einem HTTPS-Proxy läuft | `aus` |
| Benutzername | Domoticz-Login (leer lassen wenn keine Auth aktiviert) | `admin` |
| Passwort | Domoticz-Passwort | `geheim` |

> **Hinweis bei Docker auf demselben Server wie Domoticz:**
> Nicht `localhost` verwenden — der Container kann seinen eigenen `localhost`
> nicht verlassen. Stattdessen:
> - Die **echte LAN-IP** des Servers eintragen (z. B. `192.168.1.50`)
> - **oder** `host.docker.internal` (funktioniert mit der mitgelieferten compose-Datei)

### 4.4 Verbindung testen

Auf **„Verbindung testen"** klicken.

- ✓ Grüne Meldung mit Domoticz-Version → Verbindung erfolgreich
- ✗ Rote Fehlermeldung → IP/Port oder Zugangsdaten prüfen

### 4.5 Speichern

Auf **„Speichern"** klicken. Die Einstellungen werden dauerhaft in
`config/settings.json` gespeichert.

---

## 5. Seiten anlegen

DOMDIS unterstützt beliebig viele Seiten. Jede Seite kann eigene Geräte
enthalten — z. B. „Wohnzimmer", „Küche", „Garten", „Energie".

### 5.1 Neue Seite erstellen

1. Einstellungen öffnen (⚙)
2. Reiter **„Seiten"** auswählen
3. Auf **„+ Seite hinzufügen"** klicken
4. Namen eingeben und bestätigen

Die neue Seite erscheint sofort in der Navigation (Pfeile links/rechts,
Punkte unten).

### 5.2 Seite löschen

Im Reiter „Seiten" auf das **✕** neben dem Seitennamen klicken.

> Achtung: Alle Widgets auf dieser Seite werden ebenfalls gelöscht.

### 5.3 Zwischen Seiten navigieren

- **Pfeil-Buttons** links und rechts am Bildschirmrand
- **Wischen** (Touch-Geste, links/rechts)
- **Punkte** unten im Dashboard direkt antippen

---

## 6. Geräte hinzufügen

Geräte werden aus Domoticz geladen und einzelnen Seiten zugewiesen.

### 6.1 Schritt für Schritt

1. Einstellungen öffnen (⚙)
2. Reiter **„Geräte"** auswählen
3. **Kategorie** auswählen (z. B. „Schalter / Lampen", „Temperatur" usw.)
4. **Ziel-Seite** auswählen — auf welcher Seite soll das Gerät erscheinen?
5. Auf **„Geräte laden"** klicken

Die Geräteliste wird von Domoticz abgerufen und gefiltert angezeigt.

6. Neben dem gewünschten Gerät auf **„+ Add"** klicken

Das Gerät erscheint sofort als Widget auf der gewählten Seite.
Bereits hinzugefügte Geräte sind mit „hinzugefügt" markiert.

### 6.2 Kategorien im Überblick

| Kategorie | Domoticz-Gerätetypen |
|---|---|
| Schalter / Lampen | Lichtschalter, Steckdosen, Relais |
| Dimmer | Dimmbare Lampen (mit Helligkeitsregler) |
| RGB Lampen | Farbige Lampen (RGBW, LED-Stripes) |
| Temperatur | Temperatursensoren |
| Luftfeuchte | Feuchtesensoren |
| Temp + Feuchte | Kombi-Sensoren (z. B. DHT22) |
| Thermostat | Heizkörperregler, Raumthermostate (Setpoint) |
| Wind | Windmesser |
| Regen | Regenmesser |
| UV | UV-Strahlungssensoren |
| Barometer | Luftdrucksensoren |
| Rollladen / Jalousien | Rollläden, Markisen, Jalousien |
| Szenen | Domoticz-Szenen |
| Gruppen | Domoticz-Gerätegruppen |
| Energie / Strom | Stromzähler, P1-Meter, Leistungsmesser |
| Kameras | IP-Kameras (in Domoticz hinterlegt) |

### 6.3 Gerät wieder entfernen

Im **Bearbeitungsmodus** (✏-Symbol) erscheint auf jedem Widget ein
**🗑 Papierkorb-Symbol**. Darauf tippen entfernt das Widget von der Seite.

Das Gerät bleibt in Domoticz erhalten — nur die Dashboard-Anzeige wird
entfernt.

---

## 7. Gerätetypen und Darstellungsarten

Jedes Widget kann in verschiedenen Darstellungsarten angezeigt werden.
Die Auswahl erfolgt im Bearbeitungsmodus (✏) über das ⚙-Symbol am Widget.

### Schalter / Lampen
| Darstellung | Beschreibung |
|---|---|
| **Card** | Standard-Kachel mit AN/AUS-Buttons |
| **Large** | Großer AN/AUS-Button, gut für Touch-Bedienung |
| **Button** | Minimalistischer Kippschalter |
| **Minimal** | Nur Name und Status, kein Button |

### Dimmer
| Darstellung | Beschreibung |
|---|---|
| **Card** | Schieberegler horizontal |
| **Circular** | Runder Drehregler (SVG-Dial) |
| **Vertical** | Schieberegler vertikal |
| **Minimal** | Nur Prozentwert |

### RGB-Lampen
| Darstellung | Beschreibung |
|---|---|
| **Card** | Farbpalette + Helligkeitsregler |
| **Palette** | Große Farbauswahl |
| **Minimal** | Nur Status |

### Sensoren (Temperatur, Feuchte, Wind usw.)
| Darstellung | Beschreibung |
|---|---|
| **Card** | Standard-Kachel mit Wert und Einheit |
| **Gauge** | Halbkreis-Anzeige (SVG) |
| **Large** | Großer Wert, gut lesbar aus der Entfernung |
| **Minimal** | Nur Wert |

### Energiezähler
| Darstellung | Beschreibung |
|---|---|
| **Card** | Aktueller Verbrauch + Heute + Gesamt |
| **Detailed** | Detailansicht mit allen Werten |
| **Flow** | Animierter Energie-Fluss |
| **Minimal** | Nur aktueller Watt-Wert |

### Thermostat
| Darstellung | Beschreibung |
|---|---|
| **Card** | Soll-Temperatur mit +/− Buttons |
| **Circular** | Runder Drehregler |

### Rollladen / Jalousien
| Darstellung | Beschreibung |
|---|---|
| **Card** | Auf/Stop/Zu-Buttons |
| **Shutter** | Grafische Rollladenvisualisierung |
| **Minimal** | Nur Status |

### Szenen & Gruppen
| Darstellung | Beschreibung |
|---|---|
| **Card** | Kachel mit Auslösen-Button |
| **Large** | Großer Auslösen-Button |

### Kameras
| Darstellung | Beschreibung |
|---|---|
| **Live** | Live-Bild (aktualisiert alle 5 Sekunden) |
| **Overlay** | Live-Bild mit Overlay-Informationen |
| **Minimal** | Kleines Vorschaubild |

---

## 8. Bearbeitungsmodus

### 8.1 Aktivieren

Auf das **✏ Stift-Symbol** oben rechts tippen — oder Taste **E** drücken.

Im Bearbeitungsmodus erscheint auf jedem Widget:
- **⚙** (oben links) → Widget konfigurieren
- **🗑** (oben rechts) → Widget entfernen

### 8.2 Widgets verschieben (Drag & Drop)

Im Bearbeitungsmodus ein Widget **gedrückt halten** und an die gewünschte
Position ziehen. Widgets tauschen dabei ihre Plätze.

### 8.3 Darstellungsart ändern

1. Bearbeitungsmodus aktivieren (✏)
2. Auf **⚙** am Widget tippen
3. Im Dialog die gewünschte **Darstellungsart** auswählen
4. Änderung wird sofort gespeichert

### 8.4 Widget-Größe ändern

Im selben Dialog (⚙) unter „Größe" eine der folgenden Optionen wählen:

| Größe | Raster-Spalten | Raster-Zeilen | Ideal für |
|---|---|---|---|
| **1×1** | 1 | 1 | Schalter, Sensoren |
| **2×1** | 2 | 1 | Dimmer, Energiezähler |
| **1×2** | 1 | 2 | Vertikaler Dimmer |
| **2×2** | 2 | 2 | Kameras, Energie-Detail |
| **3×1** | 3 | 1 | Breite Anzeigen |

### 8.5 Bearbeitungsmodus beenden

Erneut auf **✏** tippen oder Taste **E** drücken.

---

## 9. Themes (Designs)

DOMDIS enthält fünf fertige Farbthemes. Das gewählte Theme wird auf allen
Geräten gespeichert — auch im Kompatibilitätsmodus.

| Theme | Farbgebung |
|---|---|
| **Cyberpunk 2077** | Pink / Cyan auf fast schwarzem Hintergrund |
| **Matrix** | Grün auf schwarz (klassisches Terminal-Look) |
| **Blade Runner** | Orange / Türkis, dunkles Blau |
| **TRON Legacy** | Hellblau / Cyan auf tiefem Marineblau |
| **Synthwave** | Magenta / Gelb auf dunklem Lila |

### Theme wechseln (moderner Modus)

1. Einstellungen öffnen (⚙)
2. Reiter **„Aussehen"** auswählen
3. Theme-Kachel antippen → sofortige Vorschau

### Theme wechseln (Kompatibilitätsmodus)

1. Einstellungen öffnen (⚙-Symbol)
2. Abschnitt **„DESIGN"** → Dropdown „Theme" öffnen
3. Theme auswählen → wird sofort angewendet und gespeichert

---

## 10. Automation

Alle Automations-Einstellungen befinden sich unter ⚙ → **„Automation"**.

### Home-Seite

Legt fest, welche Seite als Startseite gilt. Nach einem Auto-Return wird
immer auf diese Seite gewechselt.

### Auto-Return

Kehrt nach einer definierten Zeit ohne Benutzerinteraktion automatisch zur
Home-Seite zurück. Nützlich für Wandtablets.

- **0** = deaktiviert
- **30** = nach 30 Sekunden zurückkehren (Standard)
- Maximum: 300 Sekunden

### Nacht-Modus

Dimmt den Bildschirm zu konfigurierbaren Zeiten automatisch ab.

| Einstellung | Beschreibung |
|---|---|
| Nacht-Modus | Ein/Aus |
| Nacht von | Startzeit (z. B. 22:00) |
| Nacht bis | Endzeit (z. B. 06:00) |
| Nacht-Helligkeit % | Helligkeit in Prozent (5–100) |

### Slideshow-Modus

Wechselt die Seiten automatisch in einem festgelegten Intervall.
Praktisch für Übersichts-Displays die unbeaufsichtigt laufen.

| Einstellung | Beschreibung |
|---|---|
| Slideshow-Modus | Ein/Aus |
| Interval (Sek.) | Sekundenzahl zwischen Seitenwechseln (3–60) |

---

## 11. Kompatibilitätsmodus für alte Geräte

Der Kompatibilitätsmodus ist speziell für ältere Browser und Geräte
entwickelt. Er verwendet ausschließlich **ES5-JavaScript**, **jQuery 1.11**
und **tabellenbasiertes Layout** — keine modernen CSS- oder JS-Features.

### Unterstützte Altgeräte

| Gerät / System | Browser |
|---|---|
| Android 4.x Tablets | Android Browser, Chrome 35 |
| iPad mini 1. Generation | Safari (iOS 5 / iOS 6) |
| iPad 1 / iPad 2 | Safari (iOS 5) |
| Windows Vista / 7 | Internet Explorer 9, IE 10 |
| Windows XP | Internet Explorer 9 (mit Einschränkungen) |
| Alte Smart-TV-Browser | WebKit-basierte Browser |

### 11.1 Kompatibilitätsmodus aufrufen

Es gibt **drei Wege**:

**Weg 1 — Direkte URL (empfohlen für Lesezeichen):**
```
http://<IP-des-Servers>:3001/compat
```
Beispiel: `http://192.168.1.50:3001/compat`

**Weg 2 — URL-Parameter:**
```
http://<IP-des-Servers>:3001/?compat=1
```
Leitet automatisch auf `/compat` weiter.

**Weg 3 — Lesezeichen auf dem Altgerät anlegen:**

Auf dem alten Gerät im Browser folgende URL öffnen und als Lesezeichen
speichern (oder zur Startseite hinzufügen):
```
http://192.168.1.50:3001/compat
```

### 11.2 Als Web-App auf dem Homescreen (iOS / Android)

Auf dem Altgerät:

**iOS (Safari):**
1. URL `http://<server>:3001/compat` im Safari öffnen
2. Unten auf das **Teilen-Symbol** (Quadrat mit Pfeil) tippen
3. **„Zum Home-Bildschirm"** auswählen
4. Name eingeben (z. B. „DOMDIS") → **„Hinzufügen"**

Das Dashboard startet dann ohne Browser-Adressleiste im Vollbild.

**Android 4.x:**
1. URL im Browser öffnen
2. Menü → **„Zum Startbildschirm hinzufügen"**

### 11.3 Unterschiede zum modernen Modus

| Funktion | Modern | Compat |
|---|---|---|
| Alle Gerätetypen | ✓ | ✓ |
| Themes (5 Designs) | ✓ | ✓ |
| Kamera-Livebild | ✓ | ✓ |
| Energie (Watt + kWh) | ✓ | ✓ |
| Thermostat +/− | ✓ | ✓ |
| RGB Farbwahl | Farbpalette | Farbfelder |
| Seiten verwalten | ✓ | ✓ |
| Geräte hinzufügen | ✓ | ✓ |
| Drag & Drop | ✓ | — |
| Widget-Größen | ✓ | — |
| Darstellungsarten | ✓ | — |
| Nacht-Modus | ✓ | — |
| Slideshow | ✓ | — |
| CSS Grid Layout | ✓ | — (Tabellen) |

### 11.4 Einstellungen im Kompatibilitätsmodus

Das Einstellungs-Panel öffnet sich über das **⚙-Symbol** oben rechts.

Folgende Abschnitte sind verfügbar:

**DESIGN** — Theme auswählen (Dropdown)

**VERBINDUNG** — Domoticz Host/Port/User/Passwort + Verbindungstest

**GERÄTE HINZUFÜGEN:**
1. Seite auswählen (Ziel)
2. Kategorie auswählen (Filter)
3. **„Geräte laden"** klicken
4. **„+ Add"** neben dem Gerät klicken

**SEITEN VERWALTEN:**
- **„+ Neue Seite"** → neue Seite anlegen
- **✕** neben Seitenname → Seite löschen

**AUTOMATION** — Home-Seite und Auto-Return konfigurieren

### 11.5 jQuery-Fallback für offline-Szenarien

Wenn das Altgerät keinen Internetzugang hat (kein CDN-Zugriff), lädt der
Compat-Modus jQuery automatisch vom lokalen Server nach:

```javascript
// In compat.html eingebaut:
if (typeof jQuery === 'undefined') {
  // Lädt /js/jquery-1.11.3.min.js vom DOMDIS-Server
}
```

Um dies zu aktivieren, jQuery-Datei einmalig herunterladen und ablegen:

```bash
curl -o /opt/domdis/public/js/jquery-1.11.3.min.js \
  https://code.jquery.com/jquery-1.11.3.min.js
# oder im Docker-Container:
docker exec domdis wget -O /app/public/js/jquery-1.11.3.min.js \
  https://code.jquery.com/jquery-1.11.3.min.js
```

---

## 12. Kamera-Livebild

### Wie es funktioniert

DOMDIS proxyt Kamera-Snapshots über den eigenen Server — die Kamera-URL und
Zugangsdaten werden **nie an den Browser übertragen**. Der Browser ruft nur
`/api/domoticz/camera/:idx/snapshot` auf.

### Voraussetzungen

Die Kamera muss in **Domoticz unter „Kameras"** eingerichtet sein
(Domoticz → Einrichtung → Mehr Optionen → Kameras).

### Anzeige im Dashboard

1. Einstellungen → Geräte → Kategorie **„Kameras"**
2. Kamera mit **„+ Add"** zur gewünschten Seite hinzufügen
3. Im Bearbeitungsmodus (✏) Darstellungsart wählen:
   - **Live** — Bild aktualisiert sich alle 5 Sekunden automatisch
   - **Overlay** — Live mit Overlay
   - **Minimal** — Kleines Bild

### Kamera im Kompatibilitätsmodus

Im Compat-Modus aktualisiert sich das Kamerabild alle **10 Sekunden**
automatisch via `setInterval`. Funktioniert auf iOS 5, Android 4 und IE9.

---

## 13. Fehlerbehebung

### Dashboard lädt nicht

```bash
# Docker: Ist der Container aktiv?
docker compose ps
docker compose logs --tail=50

# Manuell: Läuft der Prozess?
systemctl status domdis
```

### Verbindungsfehler zu Domoticz (503 / Timeout)

**Bei Docker auf demselben Server wie Domoticz:**

```bash
# Prüfen wo Domoticz lauscht:
ss -tlnp | grep 8080

# 127.0.0.1:8080 → Domoticz hört nur auf localhost
# In docker-compose.yml: network_mode: "host" aktivieren
# Dann in DOMDIS: Host = localhost

# 0.0.0.0:8080 → Domoticz ist von außen erreichbar
# In DOMDIS: echte LAN-IP des Servers eintragen
```

**Verbindungstest aus dem Container heraus:**

```bash
docker exec domdis wget -qO- "http://192.168.1.100:8080/json.htm?type=command&param=getversion"
```

### Einstellungen werden nicht gespeichert

```bash
# Schreibrechte auf dem config-Verzeichnis prüfen:
ls -la ~/domdis/config/

# Berechtigungen reparieren:
chmod a+w ~/domdis/config/
chmod a+w ~/domdis/config/*.json

# Container neu starten (Entrypoint setzt Rechte automatisch):
docker compose down && docker compose up -d
```

### Geräte werden nicht geladen (404 / leere Liste)

- Domoticz-Version prüfen: Ab 2024.x wird die neue API verwendet
  (`type=command&param=getdevices`)
- Verbindungstest in den Einstellungen durchführen
- Domoticz-Zugangsdaten prüfen (Benutzer braucht Leserechte)

### Kamera zeigt kein Bild

- Kamera in Domoticz eingerichtet? (Einrichtung → Mehr Optionen → Kameras)
- Kamera-URL von Domoticz aus erreichbar?
- Im Browser-Entwicklertool (F12) → Netzwerk → Fehler beim
  `/api/domoticz/camera/:idx/snapshot`-Request prüfen

### Kompatibilitätsmodus — jQuery lädt nicht

Tritt auf wenn das Altgerät keinen Internetzugang hat:

```bash
# jQuery lokal bereitstellen:
wget -O /opt/domdis/public/js/jquery-1.11.3.min.js \
  https://code.jquery.com/jquery-1.11.3.min.js
systemctl restart domdis
```

---

## 14. Verzeichnisstruktur

```
domdis/
│
├── server.js                   ← Express-Server (Einstiegspunkt)
│
├── routes/
│   ├── proxy.js                ← Domoticz API-Proxy, Kamera-Proxy
│   └── settings.js             ← Einstellungen & Seiten CRUD
│
├── public/                     ← Statische Dateien (vom Browser geladen)
│   ├── index.html              ← Modernes Dashboard
│   ├── compat.html             ← Kompatibilitäts-Dashboard (ES5)
│   │
│   ├── css/
│   │   ├── base.css            ← Layout, Widget-Styles (moderner Modus)
│   │   ├── compat.css          ← Tabellenbasiertes Layout + alle 5 Themes
│   │   └── themes/
│   │       ├── cyberpunk.css
│   │       ├── matrix.css
│   │       ├── bladerunner.css
│   │       ├── tron.css
│   │       └── retrowave.css
│   │
│   └── js/
│       ├── api.js              ← Alle Domoticz-API-Aufrufe
│       ├── widgets.js          ← Widget-Renderer (alle Darstellungsarten)
│       ├── app.js              ← App-Logik, Bearbeitungsmodus, Einstellungen
│       └── compat.js           ← Alles-in-einem ES5-Script für Compat-Modus
│
├── config/                     ← Persistente Konfiguration (Volume-Mount)
│   ├── settings.json           ← Verbindung, Theme, Automation
│   ├── pages.json              ← Seiten und Widget-Zuweisungen
│   └── defaults/               ← Leere Standard-Configs für ersten Start
│       ├── settings.json
│       └── pages.json
│
├── Dockerfile                  ← Multi-Stage Build (Node 20 Alpine)
├── docker-compose.yml          ← Compose-Konfiguration
├── docker-entrypoint.sh        ← Initialisierung & Berechtigungen beim Start
├── .env.example                ← Vorlage für Port-Konfiguration
├── domdis.service              ← Systemd-Unit für Debian/Ubuntu
├── package.json
├── README.md                   ← Kurzübersicht (Englisch)
└── ANLEITUNG.md                ← Diese Anleitung (Deutsch)
```

---

## Schnellreferenz — URLs

| URL | Beschreibung |
|---|---|
| `http://<server>:<port>/` | Modernes Dashboard |
| `http://<server>:<port>/compat` | Kompatibilitätsmodus |
| `http://<server>:<port>/?compat=1` | Weiterleitung zum Compat-Modus |
| `http://<server>:<port>/api/settings` | Einstellungen (JSON) |
| `http://<server>:<port>/api/pages` | Seiten & Widgets (JSON) |
| `http://<server>:<port>/api/domoticz/cameras` | Kameraliste (JSON) |

---

*DOMDIS — Entwickelt für den lokalen Einsatz im Heimnetzwerk.*
*Kein Cloud-Zugriff, keine Telemetrie, keine externen Abhängigkeiten.*
