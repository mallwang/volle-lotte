# Regeln von Volle Lotte

Deutsche Fassung von [rules.md](rules.md).

## Feste Regeln (nicht konfigurierbar)

- 6 Würfel. Wertung: eine einzelne 1 = 100, eine einzelne 5 = 50. Andere einzelne Würfel zählen nicht.
- Drilling in **einem** Wurf: 1er = 1.000, 2er-6er = Augenzahl x 100 (5er = 500). Kombinationen über mehrere Würfe gibt es nicht.
- Nach jedem Wurf muss mindestens ein zählender Würfel zur Seite gelegt werden. Danach sichert der Spieler die Punkte oder wirft die übrigen Würfel erneut.
- Ein Wurf ohne zählenden Würfel (Fehlwurf): Der Zug endet, alle Punkte des Zugs sind verloren (Ausnahme: Stern).
- **Volle Lotte**: Alle 6 Würfel zählen. Nach einer Vollen Lotte auf einer Bonuskarte darf der Spieler sichern oder eine neue Karte ziehen und mit 6 frischen Würfeln weitermachen. Die bisher gesammelten Punkte bleiben im Zug (ein Fehlwurf verliert alles).
- Ein Zug beginnt mit dem Ziehen einer Karte. Ein leerer Stapel wird neu gemischt.
- **Mindestpunkte** (Standard 350): Zum Sichern braucht man mindestens die Mindestpunktzahl im aktuellen Durchgang, also seit die aktuelle Karte gezogen wurde. Nach einer Vollen Lotte auf einer Bonuskarte darf sofort gesichert werden (die Summe ist immer mindestens 6x50 + 200 = 500). Zieht der Spieler stattdessen eine neue Bonuskarte, müssen für diese Karte erst die Mindestpunkte gesammelt werden, sonst ist der ganze Zug verloren. Bei Erfolg werden alle Zugpunkte gutgeschrieben.
- Kartenwirkungen:
  - **Bonus 200/300/400/500/600**: Bei einer Vollen Lotte werden die Bonuspunkte addiert. Danach darf der Spieler die nächste Karte ziehen (siehe oben).
  - **Doppel-Lotte**: Bei einer Vollen Lotte werden nur die Punkte seit dieser Karte verdoppelt (frühere Zugpunkte zählen einfach; der verdoppelte Wert muss die Mindestpunkte erreichen). Der Zug endet, der nächste Spieler ist dran.
  - **Stopp**: Der Zug endet sofort, der nächste Spieler ist dran. Nach einer Vollen Lotte gezogen, **verfallen die bisher gesammelten Punkte** (das ist das Risiko beim Weiterziehen).
  - **Stern**: Es gilt die normale Auswahlregel (mindestens ein zählender Würfel pro Wurf, mehr nach Wunsch), und der Spieler wirft bis zum Fehlwurf. Alle Zugpunkte werden am Ende gutgeschrieben, ohne Mindestpunkte. Bei einer Vollen Lotte wird keine neue Karte gezogen, der Zug endet und alle Punkte werden gutgeschrieben.
  - **Straße**: Gesammelt wird je ein Würfel pro Wert 1-6, über mehrere Würfe hinweg. Ein Wurf ohne noch fehlenden Wert ist ein Fehlwurf (0 Punkte, auch frühere Zugpunkte sind verloren). Bei Erfolg gibt es genau 2.000 Punkte für den Zug (frühere Zugpunkte werden ersetzt, nicht addiert), und der Zug endet.
  - **Plus/Minus**: Sichern ist nicht möglich; der Spieler braucht eine Volle Lotte und erhält dann nur +1.000 (die Zugpunkte verfallen). Jeder Führende (bei Gleichstand alle) verliert 1.000; wer selbst führt, verliert nichts; kein Stand fällt unter 0. Der Zug endet.
  - **Kleeblatt** (nur 1 Karte): Zwei **neue** Volle Lotten hintereinander nach dem Ziehen der Karte gewinnen das Spiel sofort (frühere Volle Lotten des Zugs zählen nicht); die Punkte sind egal. Ein Fehlwurf verliert wie üblich alle Zugpunkte.
- Folgt nach einer Vollen Lotte Straße, Doppel-Lotte, Plus/Minus oder Kleeblatt, gilt diese Karte, und der Spieler muss Erfolg haben, sonst sind alle Zugpunkte verloren.
- Spielende: Ein Spieler erreicht die Zielpunktzahl (das Spiel endet sofort) oder gewinnt per Kleeblatt. Die übrigen Spieler werden nach Punkten gereiht; gleiche Punktzahlen teilen sich einen Rang.
- Würfel und Kartenstapel erzeugt ausschließlich der Server.

## Konfigurierbare Regeln (bei Spielerstellung, Standardwerte)

| Regel                                                           | Standard                                                  |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| Zielpunktzahl                                                   | 6.000 (frei wählbar, z. B. 10.000)                        |
| Mindestpunkte zum Sichern                                       | 350 (0 = aus)                                             |
| Vier oder mehr Gleiche: jeder weitere gleiche Würfel verdoppelt | an                                                        |
| Anzahl der Karten je Typ                                        | Standardsatz unten                                        |
| Ein Spieler verlässt das Spiel                                  | ein zufälliger Computer übernimmt; Wiedereinstieg möglich |

### Standardsatz (56 Karten)

Bonus 200/300/400/500/600 je 5 (25), Doppel-Lotte 5, Stopp 10, Stern 5, Straße 5, Plus/Minus 5, Kleeblatt 1.

## Nach einer Vollen Lotte: welche Karte folgt

Nur eine Volle Lotte auf einer **Bonuskarte** erlaubt das Weiterziehen. Die bisherigen Zugpunkte werden dann _mitgetragen_.
Was die nächste Karte damit macht (Beispiel: Bonus 600 Volle Lotte mit 700 Würfelpunkten = **1.300 mitgetragen**):

| Nächste Karte    | Mitgetragene Punkte                                                            | Ergebnis                                                                                                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bonus**        | bleiben; ein neuer Durchgang beginnt                                           | Sichern braucht die Mindestpunkte dieses Durchgangs (werden sie nicht erreicht, ist alles verloren); dann werden 1.300 + Durchgang gutgeschrieben. Fehlwurf: **alles verloren** (1.300 + Durchgang, 0 gutgeschrieben). Eine weitere Volle Lotte addiert den neuen Bonus; weiterziehen ist wieder möglich. |
| **Stopp**        | **verfallen**                                                                  | Der Zug endet sofort, 0 Punkte werden gutgeschrieben. Der Hinweis nennt die verlorenen Punkte („1.300 Punkte verloren“).                                                                                                                                                                                  |
| **Stern**        | bleiben; Sichern nicht möglich, es wird bis zum Ende geworfen                  | Fehlwurf: 1.300 + Durchgang werden gutgeschrieben (Stern kann nichts verlieren). Volle Lotte: ebenso. Beispiel: Durchgang 250 ergibt 1.550.                                                                                                                                                               |
| **Doppel-Lotte** | bleiben, **nicht verdoppelt**; Sichern mit mitgetragenen Punkten nicht möglich | Volle Lotte: 1.300 + 2 x Durchgang, z. B. Durchgang 700 ergibt 1.300 + 1.400 = 2.700 (der verdoppelte Durchgang muss die Mindestpunkte erreichen, sonst ist alles verloren). Fehlwurf: **alles verloren** (1.300 + Durchgang, 0 gutgeschrieben).                                                          |
| **Straße**       | werden bei Erfolg durch 2.000 **ersetzt**                                      | Straße geschafft: genau 2.000 (auch wenn mehr mitgetragen wurde, z. B. 2.500 werden zu 2.000). Fehlwurf: **alles verloren** (1.300 + Durchgang, 0 gutgeschrieben).                                                                                                                                        |
| **Plus/Minus**   | verfallen bei Voller Lotte; Sichern nicht möglich                              | Volle Lotte: nur +1.000, Führende verlieren 1.000 (die 1.300 sind weg). Fehlwurf: **alles verloren** (1.300 + Durchgang, 0 gutgeschrieben).                                                                                                                                                               |
| **Kleeblatt**    | für den Sieg unerheblich; Sichern nicht möglich                                | Zwei neue Volle Lotten hintereinander gewinnen das Spiel. Fehlwurf zu jedem Zeitpunkt (auch nach der ersten): **alles verloren** (1.300 + Durchgang, 0 gutgeschrieben).                                                                                                                                   |

Ohne mitgetragene Punkte (erste Karte eines Zugs) gilt: Bonus und Doppel-Lotte können sofort gesichert werden, sobald die Mindestpunkte erreicht sind. Stern, Straße, Plus/Minus und Kleeblatt können nie gesichert werden und enden in einem Fehlwurf oder einer Vollen Lotte. Stopp beendet den Zug ohne Wirkung.
