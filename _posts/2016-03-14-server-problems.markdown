---
layout: post
title: Server Probleme von 12.3.2016 bis zum 14.3.2016
comments: true
author: David Sichau
permalink: server-problems
---

Wir hatten am Wochenende einen Ausfall der Datenbank, wodurch das E.Tutorial nicht verwendbar war. Wir konnten das Problem
leider nicht kurzfristig beheben, da die Datenbank von den Informatikdiensten der ETH verwaltet wird. Wir möchten uns für
den Ausfall entschuldigen.

### Grund für die Probleme

Der Grund für den Ausfall war eine Verkettung von Problemen. Als erstes gab es einen Hardware Defekt auf dem Server, auf 
welchem die Datenbank läuft. Daher wurden die Datenbank auf einen anderen Server umgezogen. Dies hätte nur zu einem kurzen
Unterbruch der Datenbank geführt. Leider konnte die Datenbank auf dem neuen Rechner nicht automatisch starten, da es
Probleme mit der Konfiguration gab. Dies benötigte leider einen manuellen Eingriff des Systemadministators, welcher erst
am Montag durchgeführt werden konnte.

### Vermeidung künftiger Ausfälle

Wir möchten in der Zukunft solche Ausfälle vermeiden. Dies können wir erreichen, wenn zwei Instanzen der Datenbank auf
unterschiedlichen pysikalischen Rechnern laufen. Wir sind im Moment am Abklären der Kosten und dem notwendigen Setup.

Vielen Dank für euer Verständniss.





