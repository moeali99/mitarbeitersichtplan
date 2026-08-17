# Mitarbeiterschichtplanung

Webanwendung zur Schichtplanung mit Node.js, Express, SQLite (sql.js) und Vanilla JS.

## Voraussetzungen

- **Node.js** (z. B. v18 oder neuer) – [nodejs.org](https://nodejs.org)

## Install & Start (reproduzierbar)

```bash
npm install
npm start
```

Der Server startet auf **Port 3001**. Zusätzlich läuft ein Redirect auf **Port 3000**: Wer `http://localhost:3000` öffnet, wird automatisch auf die App weitergeleitet.

### Im Browser öffnen

- <http://localhost:3001> (Haupt-Adresse)
- oder <http://localhost:3000> (leitet auf 3001 weiter)

⚠️ Nur **localhost** ohne Port (z. B. Port 80) reicht nicht – die API läuft auf 3001. Immer **:3001** oder **:3000** verwenden.

### Demo-Login

| Rolle   | E-Mail                 | Passwort   |
| ------- | ---------------------- | ---------- |
| Admin   | `admin@example.com`    | `admin123` |

(Weitere Nutzer ggf. über Registrierung oder Admin → Benutzer anlegen.)

Der Admin-Account wird beim ersten Start automatisch angelegt. Nach dem Login erscheinen für Admin die Menüpunkte **Benutzer**, **Schichten**, **Standorte**, **Anträge**.

## Ports

| Port     | Bedeutung                                                                  |
| -------- | -------------------------------------------------------------------------- |
| **3001** | App + API (Haupt-Server)                                                   |
| **3000** | Redirect auf 3001 (optional; falls belegt, wird still ignoriert)          |

## Umgebung (optional)

Kopiere `.env.example` nach `.env` und passe an:

- `PORT` – Server-Port (Standard: 3001)
- `SESSION_SECRET` – Geheimnis für Sessions
- `SESSION_TIMEOUT_MIN` – Session-Timeout in Minuten (Standard: 30)

## Deine Features und wo sie sichtbar sind

### Für alle (nach Login)

| Feature                    | Wo sichtbar                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| Login / Registrieren       | Startseite (Karte mit Flip)                                                  |
| Dashboard                  | Nav: **Dashboard**                                                           |
| Kalender                   | Nav: **Kalender** (Monat, Legende, Heute, Klick → Modal)                     |
| Meine Schichten            | Nav: **Meine Schichten** (Tausch anbieten/zurückziehen)                      |
| Zeiterfassung              | Nav: **Zeiterfassung** (Check-In/Out, Historie, Summe; Admin: alle Mitarbeiter, CSV) |
| Schichttausch              | Nav: **Schichttausch** (Anfragen, Angebote)                                  |
| Nachrichten                | Nav: **Chat** (Liste, Tabs, Neue Nachricht, Als gelesen)                      |
| Verfügbarkeit              | Nav: **Verfügbarkeit**                                                       |
| Urlaub / Krank             | Nav: **Urlaub / Krank** (Formulare + Meine Anträge)                          |
| Aufgaben                   | Nav: **Aufgaben** (Liste, Erledigen, Löschen)                                |
| Team                       | Nav: **Team**                                                                |
| Benachrichtigungen         | Glocke oben rechts + Dropdown                                               |
| Profil (Passwort ändern)   | Button **Profil** oben rechts                                               |
| FAB                        | **+** unten rechts (Neue Schicht, Urlaub, Nachricht, Export)                 |

### Nur für Admin

| Feature           | Wo sichtbar                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| Benutzer          | Nav: **Benutzer** (Neu, Tabelle, Bearbeiten, Passwort setzen, Löschen)       |
| Schichten         | Nav: **Schichten** (Schicht anlegen **mit Mitarbeiter-Zuweisung**, Liste, Löschen) |
| Standorte         | Nav: **Standorte** (Liste, Anlegen, Bearbeiten, Löschen; vorher nur API)       |
| Urlaubsanträge    | Nav: **Anträge** (Genehmigen/Ablehnen)                                        |

---

## Funktionen (voll umgesetzt)

- **Auth:** Login, Registrierung (Flip-Karte), Passwort ändern, Session-Timeout (30 Min), Rollen Admin/Mitarbeiter, Passwort-Richtlinien (8 Zeichen, Zahl)
- **Dashboard:** Stunden/ Schichten-Statistik, nächste Schichten
- **Kalender:** Monatsansicht, Legende (frei/kommend/gearbeitet), Klick auf Tag → Modal mit Schichtdetails, Bearbeiten/Tauschen, Heute-Button, Doppelbelegungs-Check
- **Meine Schichten:** Liste, Tausch anbieten / zurückziehen
- **Schichttausch:** Angebote, Anfragen annehmen/ablehnen, Anfrage senden
- **Nachrichten:** Vollständig: Konversationen (DM + Team), Liste mit Snippet/Datum/Unread, Tabs (Alle/Posteingang/Gesendet/Team), „Neue Nachricht“-Modal (An, Betreff, Nachricht), Als gelesen / Alle als gelesen, Polling 5 s, Leerzustand + Fehlerhandling
- **Zeiterfassung:** Check-In/Check-Out pro Schicht (Kalender-Modal + Seite Zeiterfassung), 1 aktiver Check-In max, Historie, Admin-Übersicht + CSV-Export
- **Verfügbarkeit:** Liste, Einträge anlegen/löschen
- **Urlaub/Krank:** Anträge stellen, Admin genehmigt/ablehnt
- **Aufgaben:** Anlegen, erledigen, löschen
- **Team:** Übersicht
- **Admin:** Benutzer (Modal anlegen, bearbeiten, löschen, Passwort setzen), Schichten (Modal anlegen, löschen), Urlaubsanträge
- **Standorte:** Admin-Seite + API (CRUD), Menüpunkt „Standorte“
- **Benachrichtigungen:** Glocke, Badge, Liste, Alle lesen
- **FAB:** Neue Schicht, Urlaub, Nachricht, Export (Platzhalter)
- **Audit-Log** (Backend bei Benutzer-Aktionen)

## Optional / nicht umgesetzt

- 2FA, Profilbild
- Weitere Rollen (Manager, HR, Finanz, Standortleiter, Read-Only) – DB nur admin/mitarbeiter
- Schicht-Templates, Serien-Schichten, Standort im Schicht-Formular
- Wochen-/Tagesansicht Kalender, Ruhezeit-Check
- Weitere Abwesenheitstypen, Resturlaub-Anzeige
- Gehalt/Lohnabrechnung/PDF – Tabellen vorhanden, keine API/UI
- HR erweitert (Personalnummer, Dokumente), DSGVO-Export, iCal

## Projektstruktur

```text
├── server.js           # Einstieg, Session, Routen
├── lib/
│   ├── db.js           # SQLite (sql.js), Auto-Init
│   ├── auth.js         # bcrypt, requireAuth, requireAdmin, Passwort-Richtlinien
│   └── audit.js        # Audit-Log
├── routes/             # API: auth, users, shifts, absences, availability, dashboard, tasks, team, messages, notifications, locations, shift-swap, time
├── scripts/
│   └── init-db.js      # Schema (SCHEMA, SCHEMA_EXTRA, SCHEMA_CHAT)
├── public/
│   ├── index.html      # SPA (Auth + App)
│   ├── css/style.css
│   └── js/
│       ├── api.js      # API-Helfer
│       └── app.js      # Routing, Views, Modals
└── data/
    └── schichtplanung.db   # SQLite-Datei (wird automatisch erzeugt)
```

## Prüfanleitung

1. **Als Admin einloggen:** `admin@example.com` / `admin123`
2. **Im oberen Menü müssen erscheinen:** Benutzer, Schichten, Standorte, Anträge
3. **Standorte öffnen** → Liste anzeigen, **Standort anlegen** (Name Pflicht), Bearbeiten, Löschen testen
4. Alle anderen Features sind über Navigation / Glocke (Benachrichtigungen) / Profil / FAB (**+** unten rechts) erreichbar

## Skripte

- `npm start` – Server starten
- `npm run init-db` – DB manuell initialisieren (optional, passiert sonst beim Start)
- **`npm run seed-demo`** – Demo-Daten erzeugen (Beispiel-Nutzer + Schichten für die nächsten 2 Wochen). Für Präsentation/Abgabe: einmal ausführen, dann Kalender und „Meine Schichten“ sind befüllt. Demo-Logins: `maria@example.com`, `tom@example.com`, `lena@example.com` / Passwort: `demo123`. Nach dem Seed ggf. Server neu starten.

## Lizenz

Projekt für Lehrzwecke.
