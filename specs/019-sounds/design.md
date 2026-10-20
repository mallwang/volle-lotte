# Design: Sounds

**Mockup**: [mockup.html](mockup.html) (static, clickable, non-functional, local file). Original Artifact (may go stale): https://claude.ai/artifact/PYN71KJnUg5Q8FaVvDLZLW. Controls: viewport (desktop, mobile), state (sounds on, muted, focus with tooltip, cue: your turn, cue: countdown, cue: Volle Lotte), language (EN, DE), theme button; the sound button itself toggles on and muted.

## Approved layout

```
Menubar (spec 009, every screen)
  [logo] Volle Lotte v…   Lobby  Create game  Current game [Running]   ... [flag ▾] [sound] [theme]
  sound on    : speaker with waves  (pi-volume-up),  tooltip "Mute sounds"
  sound muted : speaker with a cross (pi-volume-off), tooltip "Turn sounds on"
  same round text button as the theme button, same focus ring
Table (spec 007): no new visuals; sounds follow what the table already shows
  your turn   : when the own seat becomes the current seat
  countdown   : during the last 5 s of the own turn timer bar
  Volle Lotte : when the own roll result "Volle Lotte" appears
  points      : when the own credited points appear in the result notice
  game start  : when the table opens on a new game (no visual change)
```

- **Sound button** (FR-008, FR-009, FR-010): between the language select and the theme button, as a round text icon button like the theme button. The icon shows the current state; the tooltip names the action; `aria-pressed` is true while muted. Accessible label: "Sounds: on. Mute sounds" / "Sounds: off. Turn sounds on"; German "Töne: an. Töne stummschalten" / "Töne: aus. Töne einschalten"; tooltip "Mute sounds" / "Turn sounds on", German "Töne stummschalten" / "Töne einschalten".
- **Mobile** (spec 008 scaling): the button stays in the menubar end group; no extra entry or menu.
- **Cues at the table** (FR-001 to FR-006, FR-018, FR-019): no indicator, badge or animation is added; the dashed tags in the mockup are review-only.

## Sound files

| Cue            | File                     | Requirements         |
| -------------- | ------------------------ | -------------------- |
| Game start     | `sounds/game-start.mp3`  | FR-005               |
| Your turn      | `sounds/your-turn.mp3`   | FR-001, FR-002       |
| Countdown beep | `sounds/countdown.mp3`   | FR-003, FR-004       |
| Applause       | `sounds/volle-lotte.mp3` | FR-006               |
| Defeat         | `sounds/defeat.mp3`      | FR-019               |
| Points         | `sounds/points.mp3`      | FR-018               |
| Victory        | `sounds/victory.mp3`     | FR-007 (exists, 013) |

All under `apps/frontend/public/sounds/`; the six new files are copies of `victory.mp3` until the user delivers the real ones (FR-014).

## Requirement traceability

| Region                   | Requirements                     |
| ------------------------ | -------------------------------- |
| Sound button, both icons | FR-008, FR-009, FR-010, SC-006   |
| Tooltip, label, language | FR-008, FR-016                   |
| Table cue moments        | FR-001 to FR-006, FR-013, FR-018 |
| Sound file table         | FR-014, FR-015                   |

## Out of scope for this mockup

- Audio behaviour: blocked autoplay (FR-011), restart versus overlap (FR-012), preloading (FR-015), background tabs, timing relative to the roll animation; nothing is shown to mock up.
- Spectator and replaced-seat silence (FR-013): no visual difference.
- The user guide section and roadmap update (FR-016).

## Fidelity note

Colours are the real Terracotta tokens in light and dark. The menubar, seats, dice and timer are simplified stand-ins for the PrimeNG menubar (spec 009) and the table (spec 007); icons are inline SVG stand-ins for PrimeIcons `pi-volume-up` and `pi-volume-off`, so sizes and spacing may differ in detail.
