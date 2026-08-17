# Anforderungen – Umsetzungsstatus

> Siehe auch: [ERWEITERUNGSKONZEPT.md](./ERWEITERUNGSKONZEPT.md) für Erweiterungsvorschläge und Funktionsübersicht.

<!-- markdownlint-disable MD060 -->
| Nr   | Bereich | Anforderung | Status |
|-----|--------|------------|-------|
|1.1 |Auth |Passwort (bcrypt), Session |✅ |
|1.1 |Auth |Automatisches Logout bei Inaktivität |✅ |
|1.1 |Auth |Rollenbasierte Weiterleitung |✅ |
|1.1 |Auth |2FA (optional) |🔲 Platzhalter |
|1.2 |Benutzer |Erstellen/Bearbeiten/Löschen, Aktivieren, Rollen, Kontakt |✅ |
|1.2 |Benutzer |Admin-Schutz |✅ |
|1.2 |Benutzer |Profilbild |🔲 Optional |
|1.3 |Passwort |Ändern, Sicherheitsrichtlinien (Länge/Sonderzeichen) |✅ |
|1.3 |Passwort |Passwort-Reset |✅ (Admin setzt neues Passwort) |
|2 |Rollen |Admin, Manager, HR, Finanz, Standortleiter, Mitarbeiter, Read-Only |✅ DB: roles, permissions, role_permissions, user_roles + Seed; lib/permissions.js (requirePermission); UI-Rollen-Zuweisung 🔲 |
|3.1 |Schichten |Datum, Uhrzeit, Abteilung, Anzahl, Modal |✅ |
|3.1 |Schichten |Standort, Templates, Serien |🔲 Schema vorhanden (location_id, shift_templates), keine Serien-API/UI |
|3.2 |Ansichten |Monat, Filter, Farbcodierung, Klick→Modal |✅ |
|3.2 |Ansichten |Woche/Tag-Ansicht |✅ Woche mit Zeitbalken; Tag 🔲 |
|3.3 |Konflikte |Doppelbelegung, Unterbesetzung-Anzeige |✅ |
|3.3 |Konflikte |Ruhezeit (11h), Max 48h/Woche, Konflikt-API |✅ lib/shift-conflicts.js, GET /api/conflicts, Drag&Drop-Validierung |
|4 |Verfügbarkeit & Präferenzen |Tages-/Zeitfenster, Liste |✅ |
|5 |Abwesenheiten |Urlaub, Krank, Genehmigung, Admin |✅ |
|5 |Abwesenheiten |Weitere Typen (Fortbildung, Sonderurlaub…), Resturlaub |🔲 |
|6 |Schichttausch |Anbieten, Anfrage, Annehmen/Ablehnen |✅ |
|7 |Zeiterfassung |Check-In/Out, Arbeitszeitkonto, Historie, Admin-Übersicht |✅ API /api/time, Zeiterfassung-Seite, Check-In/Out im Schicht-Modal, CSV-Export |
|8 |Finanz |Gehaltsdaten, Lohnabrechnung, PDF |🔲 Nur Tabellen, keine API/UI |
|9 |Dashboard |Statistiken, Diagramme, Filter |✅ Erweitert |
|10 |Team & Kommunikation |Team, Nachrichten (DM + Team, Tabs, Modal, Polling, Unread), Benachrichtigungen |✅ Nachrichten vollständig umgesetzt |
|11 |Aufgaben |Priorität, Fälligkeit, Filter |✅ |
|12 |HR (erweitert) |Personalnummer, Vertrag, Dokumente |🔲 Nicht umgesetzt |
|13 |Compliance |Audit-Log, Passwort-Richtlinien |✅ |
|13 |Compliance |DSGVO-Export, Löschung |🔲 |
|14 |Multi-Standort |Filialen (Standorte): vorher nur API, jetzt vollständige Admin-UI (Menüpunkt + Seite + CRUD) |✅ |
|14 |Multi-Standort |Standort-Admins, Mandanten |🔲 |
|15 |API |REST |✅ |
|15 |API |iCal, Webhooks, DATEV |🔲 |
|17 |UX |Dark Mode, Responsive, Validierung, Ladeindikatoren |✅ |
<!-- markdownlint-enable MD060 -->

🔲 = geplant/optional | ✅ = umgesetzt

---

## Nur angedeutet oder fehlend

- **2FA, Profilbild** – nicht umgesetzt
- **Rollen-UI:** DB + Middleware (requirePermission) + Seed; Zuweisung Rollen pro User in Einstellungen noch 🔲
- **Schichten:** Standort im Formular optional (location_id in DB), Templates/Serien-API/UI 🔲
- **Kalender:** Monat + Woche + Drag&Drop; Ruhezeit/48h-Check ✅; Tagesansicht 🔲
- **Abwesenheiten:** nur Urlaub/Krank; Resturlaub-Anzeige Dashboard ✅; weitere Typen/Resturlaub-Logik bei Genehmigung 🔲
- **Finanz:** Tabellen da, API/PDF 🔲
- **HR erweitert:** keine Personalnummer/Vertrag/Dokumente
- **DSGVO:** kein Export/Löschung-Flow
- **iCal/Webhooks/DATEV:** nicht umgesetzt
- **Architektur:** lib/validators.js ✅, lib/permissions.js ✅, lib/shift-conflicts.js ✅, einheitliche Fehlerantworten { error } ✅

---

## Zusammenfassung

**Kernfeatures sind nutzbar:** Auth, Benutzer, Schichten, Kalender, Schichttausch, **Nachrichten (vollständig)**, Urlaub, Aufgaben, Team, Dashboard, Benachrichtigungen, **Standorte (jetzt UI + API)**, **Zeiterfassung (API + UI)**. Admin sieht Menüpunkte Benutzer, Schichten, Standorte, Anträge; Standorte-Seite bietet vollständiges CRUD gegen die bestehende API.

---

## Standorte (Admin-UI)

- **Vorher:** Nur API (CRUD) vorhanden.
- **Jetzt:** Vollständige UI: Menüpunkt **Standorte** im Admin-Bereich, Seite mit Liste, Button „Standort anlegen“, pro Standort Bearbeiten + Löschen, Modal mit Validierung (Name Pflicht), Toasts bei Erfolg/Fehler. Rechte: nur Admin (Navigation + Route-Guard).

---

## Nachrichten (vollständig umgesetzt)

Die Nachrichten-Seite ist vollständig angebunden und nicht mehr „nur angedeutet“.

### 6.1 Datenbank

- **scripts/init-db.js:** In SCHEMA_EXTRA und SCHEMA_CHAT hat `chat_messages` die Spalte **subject** (TEXT, optional) und den Index **idx_chat_messages_conv_id** auf (conversation_id, id).
- **lib/db.js:** Beim Start wird bei bestehender DB ausgeführt: `ALTER TABLE chat_messages ADD COLUMN subject TEXT` (falls noch nicht vorhanden), `CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_id ON chat_messages(conversation_id, id)`.

### 6.2 Backend (/api/messages)

- **GET /conversations:** Antwort um conversationId, lastMessageSnippet, lastMessageAt ergänzt (weiterhin: id, lastBody, lastAt, lastSenderId, unreadCount).
- **POST /conversations:** DM: Wenn zwischen den beiden Nutzern schon eine DM existiert → existierende id zurückgeben. Team: Wenn der Nutzer bereits in einer Team-Konversation ist → existierende id zurückgeben; sonst neue Team-Konversation mit allen userIds anlegen.
- **GET /conversations/:id:** Nachrichten enthalten subject (sofern gesetzt).
- **POST /conversations/:id/messages:** Body: body (Pflicht), subject (optional). Antwort: { id } der neuen Nachricht.
- **POST /mark-all-read:** Markiert alle Konversationen des Nutzers als gelesen (Logik wie read-all).

### 6.3 Frontend (Nachrichten-UI)

- Layout: links Konversationsliste, rechts Chat/Detail, oben Tabs + „Neue Nachricht“.
- Tabs: Alle, Posteingang (unreadCount > 0), Gesendet (lastSenderId === ich), Team (type === team).
- Konvo-Liste: Titel, Snippet, Datum, Unread-Badge; Klick lädt Nachrichten und markiert beim Öffnen als gelesen.
- Chat: Bubbles (eigene rechts), optional Betreff über dem Body, Textarea + Senden, Enter sendet, Shift+Enter neue Zeile, automatisches Scrollen nach unten.
- **Neue Nachricht Modal:** „An“ Dropdown („Alle (Team)“ + alle Mitarbeiter), Betreff optional, Nachricht Pflicht; Senden legt ggf. Konversation an, sendet Nachricht, öffnet Konversation.
- **Polling:** alle 5 s Konversationsliste; bei geöffneter Konversation Nachrichten mitladen.
- **Fehler:** API-Fehler → Toast; 401 → Auth-Seite. **Leerzustand:** „Keine Nachrichten vorhanden.“ + Hinweis „Neue Nachricht“.

### 6.4 Team & Rechte

- „Alle (Team)“ nutzt exakt eine Team-Konversation (Backend liefert vorhandene oder erstellt sie).
- Alle eingeloggten Nutzer (Mitarbeiter + Admin) können DM und Team nutzen.

### 6.5 Abgleich

- Konversationen (DM + Team), Nachrichten senden/empfangen, DB-persistiert; Unread-Badges, beim Öffnen gelesen; Tabs sinnvoll; Modal „Neue Nachricht“ komplett; Polling; Fehlerbehandlung + 401; Schema: conversations, conversation_members (last_read_message_id), chat_messages (subject), Index (conversation_id, id).

---

## Prüfanleitung

1. **Als Admin einloggen:** `admin@example.com` / `admin123`
2. **Im oberen Menü müssen erscheinen:** Benutzer, Schichten, Standorte, Anträge
3. **Standorte öffnen** → Liste anzeigen, Standort anlegen (Name Pflicht), Bearbeiten, Löschen testen
4. Alle anderen Features sind über Navigation / Glocke (Benachrichtigungen) / Profil / FAB (**+** unten rechts) erreichbar

---

## Fertigstellung

- **Modals:** Benutzer anlegen, Schicht anlegen, Neuer Chat (An, Betreff, Nachricht), Standort anlegen/bearbeiten, Export (Platzhalter).
- **Nachrichten (Chat):** Vollständig: Konversationen (DM + Team), Unread-Badges, Tabs, „Neue Nachricht“-Modal, Polling 5 s, Leerzustand, Fehlerhandling.
- **Standorte:** Admin-UI mit Liste, Anlegen, Bearbeiten, Löschen (vorher nur API).
- **Zeiterfassung:** Check-In/Out im Schicht-Modal, Seite Zeiterfassung mit Historie und Summe, Admin-Übersicht + CSV-Export.
- **Projekt:** README mit Feature-Übersicht und Prüfanleitung, `docs/ANFORDERUNGEN-STATUS.md`, `.env.example`, `dotenv`.
