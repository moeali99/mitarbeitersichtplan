# Erweiterungskonzept – Professionelle Weiterentwicklung der Schichtplanungs-App

Um das System von einer funktionierenden Studienlösung zu einer professionellen, realitätsnahen Anwendung weiterzuentwickeln, werden folgende Erweiterungen empfohlen.

---

## 1. Sicherheit & Professionalität

### 1.1 Zwei-Faktor-Authentifizierung (2FA)
- **Ziel:** Erhöhung der Systemsicherheit
- **Funktion:** Login mit Passwort + Einmalcode (E-Mail oder Authenticator-App); besonders für Admin-Zugänge
- **Mehrwert:** Professioneller Sicherheitsstandard, realitätsnah für produktive Systeme

### 1.2 Rollen- & Rechte-System erweitern
- **Aktuell:** Mitarbeiter / Admin
- **Erweiterung:** Teamleiter, HR, Standortleiter mit feingranularen Rechten
- **Mehrwert:** Realitätsnahe Unternehmensstruktur

### 1.3 Audit-Log (Änderungsprotokoll)
- Speichert: Wer hat wann was geändert (Schicht, Urlaub, Benutzerrolle)
- Mehrwert: Transparenz, Rechtssicherheit, Enterprise-Standard

---

## 2. Kalender- & Planungs-Upgrade
- **2.1 Tagesansicht:** Detailansicht für einzelne Tage, stundenbasiert
- **2.2 Farbcodierung:** Früh-/Spät-/Nachtschicht, Urlaub/Krankheit, eigene Schichten
- **2.3 Drag & Drop (Admin):** Schichten per Drag & Drop zuweisen
- **2.4 iCal / Google Calendar Export:** Eigene Schichten exportieren/synchronisieren

---

## 3. Erweiterte Zeiterfassung
- **3.1 Überstundenberechnung:** Soll-/Ist-Stunden, Überstunden
- **3.2 Monats- und Jahresreport:** Export PDF/CSV für Lohnbuchhaltung
- **3.3 Korrekturanträge:** Mitarbeiter meldet Änderung, Admin genehmigt

---

## 4. Kommunikation auf Enterprise-Niveau
- **4.1 Push-Benachrichtigungen:** Neue Chat-Nachricht, Schicht, Urlaub, Schichttausch-Anfrage
- **4.2 Lesebestätigung im Chat:** „Gelesen“, Online/Offline
- **4.3 Benachrichtigungszentrale:** Historie aller Ereignisse, filterbar

---

## 5. Analyse & Management-Dashboard
- **5.1 KPI-Dashboard für Admin:** Mitarbeiteranzahl, Krankenquote, Urlaubstage, Überstunden
- **5.2 Standort-Auswertung:** Arbeitsstunden pro Standort, Mitarbeiterverteilung, Belastung

---

## 6. Professionelle Finanzverwaltung
- **6.1 Automatische Lohnberechnung:** Zuschläge Nacht/Feiertag, Überstunden, Netto/Brutto realitätsnah
- **6.2 PDF-Lohnabrechnung:** Monatliche Abrechnung zum Download

---

## 7. System-Architektur-Upgrade
- **7.1 REST + WebSocket getrennt:** REST für Daten, WebSocket für Echtzeit
- **7.2 API-Dokumentation (Swagger):** Interaktive API-Übersicht
- **7.3 Logging & Monitoring:** Server-Logs, Fehler-Tracking, Performance

---

## 8. UX & Design-Optimierung
- **8.1 Leere-Zustände:** Statt „Keine Einträge“ z. B. „Noch keine Verfügbarkeit – jetzt hinzufügen.“
- **8.2 Moderne UI:** Hover, Shadows, Animationen, konsistente Buttons
- **8.3 Mobile:** Menü für Smartphone, Kalender responsive, FAB klarer

---

## 9. Zukunftsfeatures
Mehrsprachigkeit (DE/EN), KI-Schichtvorschläge, Konflikterkennung, Ressourcenplanung, API/Webhooks, DSGVO-Datenexport.

---

## Zusammenfassung
Die Anwendung ist funktional vollständig für eine Studienlösung. Mit den vorgeschlagenen Erweiterungen kann das System auf professionelles, produktionsnahes Niveau weiterentwickelt werden. Die Architektur ist modular (REST + Echtzeit) und erlaubt diese Erweiterungen problemlos.

---

# Funktionen für alle Nutzer (Mitarbeiter & Admin)

| Bereich | Zweck | Funktionen |
|--------|--------|------------|
| **Dashboard** | Startseite | Kennzahlen (Stunden, Schichten, Resturlaub), „Wer arbeitet heute?“, Schnellzugriff „+“ |
| **Kalender** | Schichten darstellen | Monat/Woche, Klick → Details, optional: Farbcodes, Filter, Tagesansicht |
| **Meine Schichten** | Persönliche Übersicht | Eigene Schichten, Details, Filter Zeitraum |
| **Zeiterfassung** | Arbeitszeiten | Check-In/Check-Out, Summen, Monats-/Jahresübersicht; Admin: CSV-Export |
| **Schichttausch** | Flexible Planung | Schicht anbieten, Anfragen annehmen/ablehnen |
| **Chat** | Teamkommunikation | Direktnachrichten, Team-Chat |
| **Verfügbarkeit** | Planung | Angabe wann verfügbar, Admin sieht bei Planung |
| **Urlaub / Krank** | Abwesenheit | Urlaub beantragen, Krankmeldung (+ Attest), Status, Resturlaub |
| **Aufgaben** | To-dos | Erstellen, Fälligkeit, Status |
| **Mitarbeiter** | Teamübersicht | Liste aller, Rollen (Admin), Kontakt |
| **Finanzen** | Gehalt | Stundenlohn, Steuerklasse, Brutto-/Netto-Schätzung |

---

# Admin-Bereich (nur für Admin sichtbar)

- **Benutzer:** Nutzer anlegen, Rollen vergeben, Bearbeiten/Löschen
- **Schichten:** Schichten erstellen/bearbeiten, Mitarbeitende zuweisen
- **Standorte:** Standorte/Abteilungen verwalten
- **Anträge:** Urlaubsanträge genehmigen/ablehnen, Überblick Krankmeldungen
