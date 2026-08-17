# Smoke-Test-Checkliste (manuell)

Vor einem Release oder nach größeren Änderungen diese Schritte durchgehen. Alle als Admin, sofern nicht anders angegeben.

---

## 1. Anmeldung & Navigation

- [ ] **Admin-Login:** `admin@example.com` / `admin123` → Dashboard sichtbar
- [ ] **Mitarbeiter-Login:** (eigenen Test-User anlegen) → Kein Zugriff auf Benutzer/Schichten/Standorte/Anträge
- [ ] **Abmelden** → Login-Seite, erneuter Zugriff auf /api erfordert Login
- [ ] **Session-Timeout:** Nach konfigurierter Inaktivität → 401 / Redirect zum Login

---

## 2. Standorte (nur Admin)

- [ ] **Menü „Standorte“** sichtbar und klickbar
- [ ] **Liste:** Leerzustand mit Hinweis „Noch keine Standorte …“ + „Standort anlegen“
- [ ] **Standort anlegen:** Name Pflicht, Adresse optional → Toast „Standort angelegt“, Liste aktualisiert
- [ ] **Bearbeiten:** Name/Adresse ändern → Toast „Standort aktualisiert“
- [ ] **Löschen:** Bestätigung → Toast „Standort gelöscht“, Liste aktualisiert
- [ ] **Fehler:** Ungültige Eingabe (z. B. leerer Name) → Fehlermeldung im Modal / Toast

---

## 3. Schichten & Kalender

- [ ] **Schicht anlegen:** Datum, Start/Ende, Abteilung, Bedarf → Schicht erscheint im Kalender
- [ ] **Kalender Monatsansicht:** Schichten sichtbar, Klick auf Tag → Modal mit Schichten
- [ ] **Kalender Wochenansicht:** Toggle „Woche“, Zeitraster 6–22 Uhr, Schichten als Balken
- [ ] **Drag & Drop (Admin):** Schichtbalken in andere Spalte (Tag) ziehen → Schicht verschiebt sich, Toast „Schicht verschoben“
- [ ] **Konflikt bei Verschieben:** Verschiebung, die Ruhezeit oder 48 h/Woche verletzt → roter Hinweis, Toast mit Fehlermeldung, Schicht bleibt unverändert
- [ ] **Rückgängig:** Nach einer Verschiebung Button „Rückgängig“ → Schicht zurück auf alten Tag
- [ ] **Heute:** Button „Heute“ springt zu aktuellem Monat bzw. aktueller Woche
- [ ] **Schicht nicht gefunden:** Keine 404-Spam-Toasts bei ungültigen IDs (z. B. Kalender lädt über Range)

---

## 4. Konflikt-API (optional manuell)

- [ ] **GET /api/conflicts?userId=1&shiftId=2** (eingeloggt) → JSON mit `overlaps`, `restViolation`, `weeklyHoursViolation`, `underStaffing`
- [ ] **Fehlende Parameter** → 400 mit `error`
- [ ] **Ungültige shiftId** → 404

---

## 5. Zeiterfassung

- [ ] **Check-In:** Im Tages-Modal bei eigener Schicht „Check-In“ → Status „Eingecheckt seit …“
- [ ] **Check-Out:** „Check-Out“ → Toast mit Dauer, Status zurückgesetzt
- [ ] **Zeiterfassung-Seite:** Eigene Einträge + Summe sichtbar
- [ ] **Admin:** Filter nach Mitarbeiter, Zeitraum, CSV-Export funktioniert

---

## 6. Lohnzettel & Finanzen (wenn umgesetzt)

- [ ] **Finanzen-Seite:** Für Admin/Finanz sichtbar
- [ ] **Lohnzettel erstellen:** Mitarbeiter + Zeitraum wählen → Erstellung ohne Fehler
- [ ] **PDF-Download:** Lohnzettel als PDF herunterladbar

---

## 7. iCal (wenn umgesetzt)

- [ ] **Profil / Einstellungen:** „iCal-Link kopieren“ vorhanden
- [ ] **Link in Kalender-App einbinden** → Nur eigene Schichten erscheinen

---

## 8. 2FA (wenn umgesetzt)

- [ ] **Setup:** QR-Code anzeigen, Code bestätigen, Recovery-Codes anzeigen/speichern
- [ ] **Login mit 2FA:** Nach Passwort Abfrage TOTP-Code → erfolgreicher Login
- [ ] **Recovery-Code:** Einmal nutzbar, danach ungültig

---

## 9. DSGVO (wenn umgesetzt)

- [ ] **Datenexport:** Export anfordern → ZIP/JSON mit Profil, Schichten, Abwesenheiten, Zeiterfassung
- [ ] **Löschung:** Flow mit Bestätigung, danach User anonymisiert/gelöscht

---

## 10. Rollen & Berechtigungen (Basis)

- [ ] **Admin:** Sieht alle Menüpunkte (Benutzer, Schichten, Standorte, Anträge, …)
- [ ] **Mitarbeiter:** Sieht nur Dashboard, Kalender (eigene Schichten), Meine Schichten, Zeiterfassung, Urlaub, Nachrichten, Aufgaben, …
- [ ] **API ohne Berechtigung:** z. B. POST /api/shifts als Mitarbeiter → 403

---

## Kurzfassung

- Login (Admin + Mitarbeiter), Navigation nach Rolle
- Standorte CRUD, Empty State, Toasts
- Schicht anlegen, Kalender Monat/Woche, Drag & Drop, Konflikt/Undo
- Zeiterfassung Check-In/Out, Seite, Admin-Export
- Optional: Lohnzettel PDF, iCal, 2FA, DSGVO, Rollen-UI
