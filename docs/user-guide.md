# Volle Lotte User Guide

> Diese Anleitung ist auch auf Deutsch verfügbar: [Deutsche Benutzeranleitung](user-guide.de.md)

Volle Lotte is an online dice game for 2-8 players. Computer opponents can fill empty seats. How to play is explained in [how-to-play.md](how-to-play.md).

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Joining and Creating a Game](#2-joining-and-creating-a-game)
3. [Playing](#3-playing)
4. [Language and Theme](#4-language-and-theme)
5. [FAQ](#5-faq)

---

## 1. Getting Started

Open the app and enter a nickname (2-20 characters: letters, digits, space, `_` or `-`). The nickname is remembered in your browser, so you only enter it once. You can then open the games list.

## 2. Joining and Creating a Game

- **Join**: the games list shows each open game with its host, target score and free seats. Press **Join**. Games without a password join in one tap; password-protected games ask for the password, and after several wrong attempts the game is locked for a short time. A game that has started cannot be joined. If you left a running game, a **Rejoin** button takes your seat back from the computer.
- **Create**: press **Create game**, then choose name, optional password, number of seats (2-8) and the rules (target score, minimum points to bank, whether four of a kind doubles, cards per type). The rules cannot be changed once the game is created.
- **Game lobby**: the host can add or remove computer players (each with a skill and a risk, see below), lock seats, remove a human player (who cannot rejoin that game and sees a notice in the games list) and start the game. Everyone else waits for the host to start.
- **Leaving**: leaving a lobby or a running game (the table or lobby button, a link in the menu bar or the browser's back button) always asks for confirmation first; **Stay** keeps you where you are. A finished game is left without a question. Closing or reloading the browser tab while in a lobby or running game shows the browser's own warning (its text cannot be changed).
- **Host changes**: if the host leaves or stays offline, the next human player becomes host. A player who comes back does not get the role back. If only computers are left, nobody hosts; the first player who rejoins becomes host. The last host can instead **End game** in the games list (after a confirmation) while only computers are left. If someone rejoined in the meantime, the games list shows the new host and the end button is gone, with a notice that you are no longer the host.

## 3. Playing

On your turn:

1. **Draw card** - the card decides the special effect of the turn.
2. **Throw dice** - the server throws the dice that are not set aside.
3. **Select dice** - pick at least one scoring die (a 1, a 5 or three of a kind) and press **Set aside selected**.
4. **Bank points** or throw again. A throw without a scoring die is a bust and the points of the turn are lost.

Dice are drawn with pips. Every thrown die tumbles for 1-3 seconds and stops on the value the server threw; the log entry and notices for the throw appear once the last die has stopped, and actions stay locked until then. The computer's pick is highlighted (with a computer badge) for a short moment before it is applied; how long depends on the computer speed. With reduced motion enabled in your system, dice do not tumble; they stay blank until they stop and "Dice are rolling…" is announced.

Open **Settings** on the table to change:

- **Skip dice animation** - only on your device; dice and log show immediately.
- **Fast computer dice** - the host only, others see it read-only. Computer throws take 0.5-1.5 seconds instead of 1-3.
- **Computer speed** - the host only, others see it read-only. A slider from 1 (slow) to 5 (fast); every game starts at 3 (Medium). It sets how long computers wait between their actions and how long a turn's result stays on the table, for everyone at the table. It is also shown in the game lobby, where the host can set it before starting. Whenever the host changes a setting, every player sees a short notice naming the host and the new value; players who join later do not.
- **Show bust probability** - off by default; the host can enable it in the lobby or during play for everyone. Below the dice, above the rolling status, it shows the chance of having no valid selection on the next throw. Marking a valid selection previews the risk with those dice set aside; empty or invalid selections show no hint. Street uses the still-missing values rather than normal scoring. No hint appears when the card is complete; the first Clover Volle Lotte previews its next six dice. On Star, a failed throw still ends the turn safely: this is the probability of no scoring dice, not of losing points.

### Computer players

Every computer seat has two independent settings, both chosen by the host in the game lobby (default: medium skill, medium risk):

- **Skill** - _easy_ always takes all scoring dice, then uses simple point thresholds to stop or continue; _medium_ follows the best evaluation half the time and otherwise weighs nearby alternatives, ignoring clearly inferior moves and treating equivalent dice selections equally; _hard_ always picks the move with the best expected result (it knows the exact dice odds and the share of each card type in the deck, but never looks at the real card order).
- **Risk** - how willing the computer is to lose points for a chance of more. _No risk_ banks early and never draws another card after a Volle Lotte on a Bonus card. _Medium_ weighs chances and losses evenly and draws about half of the time when drawing and banking are equally good. _High_ leans strongly towards throwing on and drawing, but not blindly: with very many carried points and many Stop and Plus/Minus cards it holds back.
- **Random** - for either setting the computer picks a new concrete value for every single decision, so it plays erratically. A computer that replaces a leaving player has random skill and random risk.

**Names.** Every computer gets a random two-word name such as _Brave Fox_ (in German with the matching ending, for example _Mutiger Fuchs_, _Mutige Katze_, _Mutiges Kaninchen_), unique among all players and computers in the game. The language is the host's language at that moment: a computer added in the lobby, or one that replaces a player who left, is named in the host's language. If the host leaves, the computer that takes over the host's seat is named in the leaving host's language, not the new host's. A name stays the same for the rest of the game; changing the host or switching the language does not rename existing computers. When a former player takes their seat back, they get their own nickname again and the computer name is free.

**Renaming.** Only the host can rename a computer, in the lobby: edit the name directly in the computer's seat and confirm, or press the small refresh button to roll a new generated name. The name follows the nickname rules (2-20 characters: letters, digits, space, _ or -) and must not be used by another player or computer, ignoring upper and lower case. Otherwise you see a message and the old name is kept. Everyone sees the new name at once. Computers cannot be renamed once the game has started.

Whatever the settings: a computer that can bank to reach the target score does so, and on Street, Double Lotte, Plus/Minus, Clover and Star it always sets aside all dice it can. Behind the leader it takes more risk, close to the target it plays safer.

The player's score changes only when the turn ends, not when dice are set aside. In particular, Star collects pending points until a bust or Volle Lotte. Double Lotte can never be banked early; a bust loses its pending points.

Buttons that are not available show the reason (for example "Not your turn"). The log lists what happened; players who leave a running game (after a confirmation), lose their connection for 30 seconds or miss three turns in a row are replaced by a computer. A timer shows how long you have left: 10 seconds to draw or roll, 15 to choose dice, 20 to secure or continue. If time runs out the action is taken for you (a skipped draw or selection ends your turn). After the third timeout you see a notice and can only go back to the lobby. Computers pause while no human is seated.

When a player reaches the target score, the result screen ranks everyone. **Back to lobby** returns to the games list.

If the connection to the game server drops for more than a moment, a notice at the bottom says it is reconnecting and the page content is greyed out and cannot be used until the connection is back (nothing you click while offline is sent later). When it returns you see "Connection to the game server restored." for a few seconds. If it does not come back within 20 seconds, the notice turns red and offers **Reload page**; reconnecting continues in the background.

## 4. Language and Theme

The menu bar at the top is on every screen. It shows the **Lobby** and **Create game** pages (the open page is highlighted; both are disabled until you have chosen a nickname) and, while you are in a lobby or a running game, a **Current game** entry with a tag for the phase. On the right are two controls:

- **Language** (flag and name): English or Deutsch. On the first visit the app uses your browser language (German for German, otherwise English). Your choice is saved in the browser and applies at once, without reloading. On narrow screens only the flag is shown; the name stays available to screen readers.
- **Color scheme**: a sun or moon button switches between Light and Dark. The first visit follows your device setting; after you switch, your choice is saved in the browser.

## 5. FAQ

**The page is in the wrong language.** Pick the language in the header; the choice is remembered.

**Are all messages translated?** Yes. Messages about invalid rule values and rejected moves follow the selected language too.

**My game disappeared.** If the server was restarted, running games are lost. You will see a notice.

**I opened the game in a second tab.** Only one tab can play at a time; the older tab shows a notice and signs out.
