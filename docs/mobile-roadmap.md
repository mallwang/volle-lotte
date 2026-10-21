# Mobile App Roadmap

Incremental delivery plan for the Volle Lotte mobile experience. The product roadmap remains the source of priority and status; [R3](./roadmap.md#r3-mobile-app-as-installable-pwa) links here for the mobile-specific backlog.

The goal is to put usable browser builds in front of real users early, then complete the installable PWA experience. Each increment should be releasable to a test environment independently. Create a feature spec and branch for the next increment when it is picked up; this roadmap is a backlog, not a substitute for those specs.

## Delivery principles

- The mobile frontend is a separate Angular application in the Nx workspace, configured for Capacitor from the foundation increment. It shares game rules and protocol types with the existing frontend and communicates with the existing backend.
- A single backend Docker image should serve the desktop frontend, mobile frontend, API and WebSocket. Mobile releases can therefore be deployed with the existing backend release process.
- Use the existing isolated test instance at `https://test.volle-lotte.allwang.family`, with its own Docker instance and SQLite volume, so selected users can try candidate mobile builds before a production release.
- A browser-accessible test build does not need to be installable. Add manifest and service-worker behavior after the core mobile flows are usable.
- Capacitor is the selected path for a future native wrapper. Android Studio and emulator validation are deferred until after the browser PWA is established. No APK distribution or app-store publishing is included in the initial mobile increments.
- Keep the existing desktop and tablet experience unchanged.

## Increments

### M0. Mobile delivery foundation ([spec 021](../specs/021-mobile-foundation/spec.md))

**Outcome:** A separately built mobile frontend is reachable in a test deployment alongside the existing desktop app, API and WebSocket.

**Requirements**

- Create and build a dedicated Nx frontend application with the repository's existing Angular conventions.
- Configure separate browser (`/m/`) and relative-base Capacitor build outputs, plus the app identity; defer adding native platform projects until the Android emulator increment.
- Reuse shared game rules and protocol types without crossing Nx scope boundaries.
- Include both frontend builds in the single backend Docker image and serve the mobile build at an explicit mobile entry point.
- Preserve the existing desktop URL and behavior.
- Publish a uniquely tagged candidate image and document manually changing the test stack's `TAG` and redeploying it, without changing production.

**Acceptance**

- CI builds the mobile frontend; the combined Docker image can be built and published with a unique candidate tag.
- The test Portainer stack can be manually switched to that tag and rolled back to its previous tag.
- A tester can open `https://test.volle-lotte.allwang.family/m/` on a phone.
- Desktop users continue to receive the current desktop application.
- The mobile application can establish its API and WebSocket connections to the test deployment.

**Depends on:** None.

### M1. Mobile lobby and game setup

**Outcome:** A phone user can enter a game from the mobile application.

**Requirements**

- Support the existing nickname and session flow.
- Make the game list, create-game and join-game actions usable on narrow screens.
- Support the existing host settings, player seats, computer-player controls, ready state and start flow.
- Keep primary controls visible, labeled and operable with touch; handle long names and translated text without hiding actions.

**Acceptance**

- A tester can create a game and reach the ready state using a phone at the supported viewport sizes.
- A tester can join a game hosted by a desktop user and become ready.
- No primary lobby action requires browser zoom or horizontal page scrolling.

**Depends on:** M0.

### M2. Play a complete game on a phone

**Outcome:** A mobile player can finish a full game with desktop players.

**Requirements**

- Present a phone-oriented game table instead of scaling the desktop table to fit.
- Support all game actions through touch, including selecting dice, throwing, securing points, drawing or playing cards, and other actions available in the current game state.
- Keep the active player's state and turn controls clear with the maximum supported number of seats.
- Design the game table for landscape only. In portrait, show a blocker asking the user to rotate the device, without losing the current turn when rotating back. The lobby and other non-game screens keep supporting both orientations.
- Do not use the desktop small-window resize notice as a substitute for a mobile layout.

**Acceptance**

- A phone user and desktop users can complete a game together.
- A mobile player can perform every legal action in a full game without browser zoom or horizontal scrolling.
- The game remains playable at the supported landscape phone viewport sizes; portrait shows the rotate blocker instead of the table.

**Depends on:** M1.

### M3. Mobile completeness and recovery

**Outcome:** Mobile users can use the supporting game experience and recover from ordinary interruptions.

**Requirements**

- Cover game states and controls not included in the initial playable slice, including game over, rematch, game log, spectator mode and relevant host settings.
- Match existing reconnect behavior and clearly communicate connection loss and recovery.
- Check dialogs, animations, sound controls and translated content on phone screens.
- Respect reduced-motion and basic accessibility expectations for touch, keyboard, focus and contrast.

**Acceptance**

- Mobile users can complete the same supported lobby and post-game flows as desktop users.
- A temporary connection drop can recover through the existing reconnect flow without silently losing the user's place.
- Essential controls and feedback remain usable with long text and in both orientations outside a match, and in landscape during a match.

**Depends on:** M2.

### M4. Installable PWA and safe web updates

**Outcome:** The mobile web experience can be installed from supported browsers and updated without interrupting an active game.

**Requirements**

- Provide the app manifest, mobile app name, icons and install/launch experience.
- Cache versioned static assets for launch performance without serving stale application entry points or update metadata.
- Offer updates only in the lobby or after a game, never during a running game.
- Require a compatible client before entering or resuming a game when the server protocol version changes.
- Keep the mobile web app usable in browsers that do not offer installation.

**Acceptance**

- A user can install and launch the PWA from supported mobile browsers.
- An available update does not reload an active game.
- An incompatible client is directed to update before entering or resuming a game.
- A regular browser user can still open and play without installing the PWA.

**Depends on:** M3.

### M5. Capacitor Android emulator validation

**Outcome:** The same mobile experience can be packaged as a Capacitor Android app and tested in Android Studio's emulator.

**Requirements**

- Add and configure the Android platform for the mobile frontend using Capacitor.
- Define how the Android app connects to the test or production backend.
- Document and automate the build/sync steps through repository tooling where practical.
- Keep native app packaging separate from PWA deployment and service-worker updates.

**Acceptance**

- A developer can launch the mobile app in an Android Studio emulator and reach the backend.
- Core lobby and game flows can be exercised in the emulator.
- The Android build can be reproduced from the documented repository workflow.

**Depends on:** M2. This is a later development/test target, not a prerequisite for browser PWA releases.

## Decisions to make in the next feature plan

- Select a mobile entry point and routing approach that does not break service-worker scope or cache behavior.
- Choose the test deployment strategy and access controls for external testers.
- Define which browsers and phone viewport sizes are in the initial support matrix.
- Confirm the asset and runtime-configuration behavior for serving two frontend builds from one backend image.
