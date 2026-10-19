# Volle Lotte Benutzeranleitung

> This guide is also available in English: [English user guide](user-guide.md)

Volle Lotte ist ein Online-Würfelspiel für 2-8 Spieler. Computergegner können freie Plätze auffüllen. Wie das Spiel funktioniert, steht in der [Spielanleitung](how-to-play.de.md).

## Inhaltsverzeichnis

1. [Erste Schritte](#1-erste-schritte)
2. [Spiel beitreten und erstellen](#2-spiel-beitreten-und-erstellen)
3. [Spielen](#3-spielen)
4. [Sprache und Farbschema](#4-sprache-und-farbschema)
5. [FAQ](#5-faq)

---

## 1. Erste Schritte

Öffne die App und gib einen Spitznamen ein (2-20 Zeichen: Buchstaben, Ziffern, Leerzeichen, `_` oder `-`). Der Spitzname wird im Browser gespeichert, du gibst ihn also nur einmal ein. Danach öffnet sich die Spieleliste.

## 2. Spiel beitreten und erstellen

- **Beitreten**: Die Spieleliste zeigt jedes offene Spiel mit Gastgeber, Zielpunktzahl und freien Plätzen. Drücke **Beitreten**. Spiele ohne Passwort betrittst du mit einem Tipp; passwortgeschützte Spiele fragen nach dem Passwort, nach mehreren falschen Versuchen wird das Spiel kurz gesperrt. Ein gestartetes Spiel kann nicht betreten werden. Hast du ein laufendes Spiel verlassen, holt dich **Wieder beitreten** zurück auf deinen Platz.
- **Erstellen**: Drücke **Spiel erstellen** und wähle Name, optionales Passwort, Anzahl der Plätze (2-8) und die Regeln (Zielpunktzahl, Mindestpunkte zum Sichern, ob Viererpasch verdoppelt, Karten pro Typ). Die Regeln lassen sich nach dem Erstellen nicht mehr ändern.
- **Gemerkte Einstellungen und Vorlagen**: Dein Browser merkt sich den Spitznamen und das Setup des letzten Spiels, das du als Gastgeber gestartet hast: Plätze, Regeln, Computer (Können, Risiko, Platz) und Computer-Geschwindigkeit. Die nächste Seite **Spiel erstellen** ist damit vorausgefüllt, und die Lobby des neuen Spiels bekommt die Computer und die Geschwindigkeit (ein Hinweis auf der Seite sagt das). Spielname und Passwort werden nie gemerkt. **Als Vorlage speichern** legt das aktuelle Setup unter einem Namen ab (bis zu 30 Zeichen, höchstens 10 Vorlagen, bei einem vorhandenen Namen wird vor dem Ersetzen gefragt); **Vorlage laden** listet sie. Auf der Erstellen-Seite ersetzt eine Vorlage alle Werte; in der Lobby setzt sie nur Computer und Geschwindigkeit auf freie Plätze, ersetzt die vorhandenen Computer, verändert nie Spieler am Tisch und sagt dir, wie viele Computer nicht gepasst haben. Eine Vorlage lässt sich nach einer Rückfrage löschen. **Auf Standard zurücksetzen** auf der Erstellen-Seite stellt die Standardwerte wieder her und vergisst die gemerkten Computer; Vorlagen bleiben. Drückst du **Spiel starten** mit einem Setup, das weder eine gerade geladene Vorlage noch das zuletzt gespielte ist, wirst du einmal gefragt, ob du es speichern möchtest; **Nein, Spiel starten** startet wie gewohnt. Alles bleibt in deinem Browser; blockiert er das Speichern, sind die Schaltflächen deaktiviert und alles andere funktioniert mit den Standardwerten.
- **Spiellobby**: Der Gastgeber kann Computerspieler (jeweils mit Können und Risiko, siehe unten) hinzufügen oder entfernen, Plätze sperren, Menschen entfernen (sie können dem Spiel nicht mehr beitreten und sehen einen Hinweis in der Spieleliste) und das Spiel starten. Alle anderen warten auf den Start.
- **Verlassen**: Das Verlassen einer Lobby oder eines laufenden Spiels (Schaltfläche am Tisch oder in der Lobby, ein Link in der Menüleiste oder die Zurück-Taste des Browsers) fragt immer vorher nach; mit **Bleiben** bleibst du, wo du bist. Ein beendetes Spiel verlässt du ohne Rückfrage. Schließt oder lädst du den Browser-Tab in einer Lobby oder einem laufenden Spiel neu, zeigt der Browser seine eigene Warnung (der Text lässt sich nicht ändern).
- **Gastgeberwechsel**: Verlässt der Gastgeber das Spiel oder bleibt er offline, wird der nächste menschliche Spieler Gastgeber. Wer zurückkehrt, bekommt die Rolle nicht zurück. Sind nur noch Computer übrig, gibt es keinen Gastgeber; wer als Erster wieder beitritt, wird Gastgeber. Der zuletzt gegangene Gastgeber kann das Spiel stattdessen in der Spieleliste mit **Spiel beenden** löschen (nach Rückfrage), solange nur noch Computer mitspielen. Ist in der Zwischenzeit jemand wieder beigetreten, zeigt die Spieleliste den neuen Gastgeber, die Schaltfläche verschwindet und ein Hinweis erklärt, dass du nicht mehr Gastgeber bist.

## 3. Spielen

Wenn du dran bist:

1. **Karte ziehen** - die Karte bestimmt den Spezialeffekt des Zuges.
2. **Würfeln** - der Server würfelt die Würfel, die nicht beiseitegelegt sind.
3. **Würfel wählen** - wähle mindestens einen wertenden Würfel (eine 1, eine 5 oder einen Dreierpasch) und drücke **Auswahl beiseitelegen**.
4. **Punkte sichern** oder erneut würfeln. Ein Wurf ohne wertenden Würfel ist ein Fehlwurf, die Punkte des Zuges gehen verloren.

Die Würfel werden mit Augen dargestellt. Jeder geworfene Würfel rollt 1-3 Sekunden und bleibt auf dem Wert liegen, den der Server gewürfelt hat; Protokolleintrag und Hinweise zum Wurf erscheinen, sobald der letzte Würfel stillsteht, bis dahin sind Aktionen gesperrt. Die Wahl des Computers wird (mit Computer-Symbol) kurz hervorgehoben, bevor sie angewendet wird; wie lange, hängt von der Computer-Geschwindigkeit ab. Ist in deinem System reduzierte Bewegung aktiviert, rollen die Würfel nicht; sie bleiben leer, bis sie stillstehen, und „Würfel rollen…“ wird angesagt.

Unter **Einstellungen** am Tisch änderst du:

- **Würfelanimation überspringen** - nur auf deinem Gerät; Würfel und Protokoll erscheinen sofort.
- **Schnelle Computerwürfel** - nur der Gastgeber, andere sehen es schreibgeschützt. Computerwürfe dauern 0,5-1,5 statt 1-3 Sekunden.
- **Computer-Geschwindigkeit** - nur der Gastgeber, andere sehen es schreibgeschützt. Ein Regler von 1 (langsam) bis 5 (schnell); jedes Spiel startet bei 3 (Mittel). Er legt fest, wie lange Computer zwischen ihren Aktionen warten und wie lange das Ergebnis eines Zuges auf dem Tisch bleibt, für alle am Tisch. Er wird auch in der Spiellobby angezeigt, wo der Gastgeber ihn vor dem Start einstellen kann. Ändert der Gastgeber eine Einstellung, sehen alle Spielerinnen und Spieler einen kurzen Hinweis mit Namen und neuem Wert; wer später beitritt, sieht keinen.

### Computerspieler

Jeder Computerplatz hat zwei voneinander unabhängige Einstellungen, die der Gastgeber in der Spiellobby wählt (Standard: mittleres Können, mittleres Risiko):

- **Können** - _leicht_ spielt nach einer einfachen Faustregel und macht sichtbare Fehler, _mittel_ wählt meist einen guten Zug, manchmal einen schlechteren, _schwer_ wählt immer den Zug mit dem besten Erwartungswert (er kennt die genauen Würfelwahrscheinlichkeiten und den Anteil jeder Kartenart im Stapel, schaut aber nie auf die tatsächliche Kartenreihenfolge).
- **Risiko** - wie bereit der Computer ist, Punkte für die Chance auf mehr aufs Spiel zu setzen. _Kein Risiko_ sichert früh und zieht nach einer Vollen Lotte auf einer Bonuskarte nie eine weitere Karte. _Mittel_ wägt Chancen und Verluste gleich ab und zieht etwa in der Hälfte der Fälle, wenn Ziehen und Sichern gleich gut sind. _Hoch_ neigt stark zum Weiterwürfeln und Ziehen, aber nicht blind: bei sehr vielen mitgeführten Punkten und vielen Stopp- und Plus/Minus-Karten hält er sich zurück.
- **Zufällig** - bei beiden Einstellungen wählt der Computer für jede einzelne Entscheidung neu einen konkreten Wert und spielt dadurch sprunghaft. Ein Computer, der einen ausgestiegenen Menschen ersetzt, hat zufälliges Können und zufälliges Risiko.

**Namen.** Jeder Computer bekommt einen zufälligen Namen aus zwei Wörtern, zum Beispiel _Brave Fox_ (auf Deutsch mit passender Endung, etwa _Mutiger Fuchs_, _Mutige Katze_, _Mutiges Kaninchen_), eindeutig unter allen Menschen und Computern im Spiel. Die Sprache ist die des Gastgebers in diesem Moment: Ein Computer, den der Gastgeber in der Lobby hinzufügt, oder einer, der einen ausgestiegenen Menschen ersetzt, bekommt einen Namen in der Sprache des Gastgebers. Verlässt der Gastgeber das Spiel, erhält der Computer, der seinen Platz übernimmt, einen Namen in der Sprache des ausgestiegenen Gastgebers, nicht des neuen. Ein Name bleibt für den Rest des Spiels gleich; ein Wechsel des Gastgebers oder der Sprache benennt vorhandene Computer nicht um. Nimmt ein früherer Mensch seinen Platz zurück, hat er wieder seinen eigenen Spitznamen und der Computername wird frei.

**Umbenennen.** Nur der Gastgeber kann einen Computer umbenennen, in der Lobby: Ändere den Namen direkt im Platz des Computers und bestätige, oder würfle mit dem kleinen Aktualisieren-Button einen neuen Namen aus. Der Name folgt den Regeln für Spitznamen (2-20 Zeichen: Buchstaben, Ziffern, Leerzeichen, _ oder -) und darf von keinem anderen Menschen oder Computer verwendet werden, unabhängig von Groß- und Kleinschreibung. Sonst erscheint eine Meldung und der alte Name bleibt. Alle sehen den neuen Namen sofort. Nach Spielstart können Computer nicht mehr umbenannt werden.

Egal bei welchen Einstellungen: Kann ein Computer durch Sichern den Zielstand erreichen, tut er es; auf Straße, Doppel-Lotte, Plus/Minus, Kleeblatt und Stern legt er immer alle möglichen Würfel zur Seite. Hinter dem führenden Spieler geht er mehr Risiko ein, nahe am Ziel spielt er vorsichtiger.

Nicht verfügbare Schaltflächen nennen den Grund (zum Beispiel „Du bist nicht dran“). Das Protokoll listet, was passiert ist; wer ein laufendes Spiel verlässt (nach Rückfrage), 30 Sekunden offline ist oder dreimal in Folge nicht reagiert, wird durch einen Computer ersetzt. Ein Timer zeigt die Restzeit: 10 Sekunden zum Ziehen oder Würfeln, 15 zum Auswählen, 20 zum Sichern oder Weiterwürfeln. Läuft die Zeit ab, wird für dich gehandelt (übersprungenes Ziehen oder Auswählen beendet deinen Zug). Nach dem dritten Ablauf siehst du einen Hinweis und kannst nur in die Lobby zurück. Computer pausieren, solange kein Mensch am Tisch sitzt.

Erreicht jemand die Zielpunktzahl (oder gewinnt mit der Kleeblatt-Karte), öffnet sich über dem Tisch das Fenster **Spiel vorbei**, sobald die letzten Würfel stehen. Es nennt die Gewinnerin oder den Gewinner, zeigt, wie das Spiel endete, und ordnet alle nach Rang (gleiche Punktzahlen teilen sich einen Rang); die Endstände bleiben dahinter sichtbar. Das Fenster lässt sich weder durch einen Klick daneben noch mit Escape schließen, sondern nur mit **Zurück zur Lobby**, das zur Spieleliste führt. Ein beendetes Spiel wird nicht wiederhergestellt: Lädst du die Seite neu oder verbindest dich danach neu, landest du in der Spieleliste. Hast du gewonnen, regnet Konfetti über den Bildschirm, solange das Fenster offen ist; ist dein System auf reduzierte Bewegung eingestellt, bleibt es aus (das Fenster sagt trotzdem, dass du gewonnen hast).

**Revanche.** Im Fenster „Spiel vorbei“ kann der Host **Revanche** drücken. Dasselbe Spiel mit Name, Passwort, Einstellungen, Computern und Sitzreihenfolge wird wieder zur Lobby, und der Host ist sofort darin. Alle anderen, die das Fenster noch offen haben, sehen **Wieder beitreten**; der Knopf wird aktiv, sobald der Host entschieden hat. Er bringt dich auf deinen alten Platz zurück, dann drückst du wieder **Bereit**. Dein Platz bleibt für dich reserviert (gestrichelt, „Reserviert, noch nicht zurück“), bis du beitrittst, gehst, der Host dich entfernt oder das nächste Spiel startet. Der Host kann starten, ohne auf alle zu warten: Wer nicht zurückgekommen ist, verliert den Platz, und das Spiel startet mit weniger Spielern (mindestens zwei sind weiter nötig); im Fenster der Betroffenen steht dann, dass das nächste Spiel ohne sie begonnen hat. Wer das beendete Spiel verlassen, die Seite neu geladen hat oder im Spiel von einem Computer ersetzt wurde, bekommt kein „Wieder beitreten“; sein Platz ist für andere frei. **Zurück zur Lobby** geht immer. Verlässt der Host das Fenster ohne Revanche, gibt es keine.

## 4. Sprache und Farbschema

Die Menüleiste oben ist auf jeder Seite da. Sie zeigt die Seiten **Lobby** und **Spiel erstellen** (die geöffnete Seite ist hervorgehoben; beide sind gesperrt, bis du einen Spitznamen gewählt hast) und, solange du in einer Lobby oder einem laufenden Spiel bist, den Eintrag **Aktuelles Spiel** mit einem Hinweis zur Phase. Rechts sind zwei Bedienelemente:

- **Sprache** (Flagge und Name): English oder Deutsch. Beim ersten Besuch nutzt die App die Browsersprache (Deutsch bei deutschem Browser, sonst Englisch). Die Wahl wird im Browser gespeichert und gilt sofort, ohne Neuladen. Auf schmalen Bildschirmen wird nur die Flagge gezeigt; der Name bleibt für Screenreader verfügbar.
- **Farbschema**: Eine Sonne oder ein Mond schaltet zwischen Hell und Dunkel um. Beim ersten Besuch gilt die Einstellung deines Geräts; nach dem Umschalten wird deine Wahl im Browser gespeichert.

## 5. FAQ

**Die Seite ist in der falschen Sprache.** Wähle die Sprache in der Menüleiste; die Wahl bleibt gespeichert.

**Sind alle Meldungen übersetzt?** Ja. Meldungen zu ungültigen Regelwerten und abgelehnten Zügen folgen ebenfalls der gewählten Sprache.

**Mein Spiel ist verschwunden.** Nach einem Serverneustart gehen laufende Spiele verloren. Du siehst einen Hinweis.

**Ich habe das Spiel in einem zweiten Tab geöffnet.** Es kann immer nur ein Tab spielen; der ältere Tab zeigt einen Hinweis und meldet sich ab.
