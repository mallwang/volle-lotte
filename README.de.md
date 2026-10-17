# Volle Lotte

> This README is also available in English: [README.md](README.md)

Online-Multiplayer-Web-App (PWA) für das Würfelspiel _Volle Lotte_, 2-8 Spielende, Computergegner.
Hosting: https://volle-lotte.allwang.family. Ein einzelner Docker-Container (NestJS liefert API, WebSocket und den Angular-Build aus), SQLite auf einem Volume.

Spielanleitung: [docs/how-to-play.de.md](docs/how-to-play.de.md). Technische Regelreferenz: [docs/rules.de.md](docs/rules.de.md) ([englisch](docs/rules.md)).
Entwickelt mit [Spec-Kit](https://github.com/github/spec-kit) (`/speckit-*`); Prinzipien in `.specify/memory/constitution.md`.

Funktionen: Oberfläche auf Deutsch und Englisch (folgt der Browsersprache, in der Kopfzeile umschaltbar). Spielanleitung: [Deutsch](docs/how-to-play.de.md) | [English](docs/how-to-play.md). Benutzeranleitung: [Deutsch](docs/user-guide.de.md) | [English](docs/user-guide.md).

## Status

Workspace, CI (Lint, Typecheck, Test, Build, SonarCloud), die Constitution und die reine Regel-Engine (`libs/game-rules`, Spec 001) stehen; Lobby und Multiplayer (Spec 002) sind umgesetzt: ein NestJS-Socket.IO-Gateway (passwortgeschützte Spiele, 2-8 Plätze, Computerspieler, Wiederverbindung mit 60 s Karenzzeit, Protokollversion 4: offene Spiele, Entfernen und Sperren durch den Gastgeber, Computerersatz mit Wiedereinstieg, Zugtimer) und die Angular-Bildschirme Lobby, Spiellobby und Tisch. Ergänzte Abhängigkeiten: `socket.io`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io-client`. Siehe [docs/migration.md](docs/migration.md) (englisch).

Das UI-Fundament (Spec 003) steht: PrimeNG 22 mit eigenem Terracotta-Theme, Hell-/Dunkelmodus und alle Bildschirme migriert. Mehrsprachigkeit (Spec 004): Deutsch und Englisch.

## Entwicklung

Benötigt Node 24 (`nvm use`, siehe `.nvmrc`) und npm >= 11. Kopiere `.env.example` nach `.env` und setze `PRIMENG_LICENSE`; das Backend liefert den Schlüssel zur Laufzeit über `GET /api/config` an die SPA. Starte mit `npm run dev`.

## Betrieb mit Docker

Ein Image enthält alles: NestJS liefert API (`/api`), WebSocket (`/socket.io`) und den Angular-Build auf Port 3000 aus. Lokal bauen und ausprobieren:

```bash
docker build -t volle-lotte .
docker run --rm -p 8080:3000 -v "$PWD/data:/data" -e PRIMENG_LICENSE=... volle-lotte
```

Danach http://localhost:8080 öffnen. `GET /api/health` ist der Healthcheck.

## Deployment mit Portainer (oder einem anderen Docker-Hub-Host)

[`docker-compose.portainer.yml`](docker-compose.portainer.yml) zieht das fertige Image von Docker Hub, statt es zu bauen.

1. Das Image auf Docker Hub bringen, entweder:

   - **Automatisch**: Ein `v*.*.*`-Tag (z. B. via `npm run release`) startet [`.github/workflows/release.yml`](.github/workflows/release.yml), das das `Dockerfile` baut und `walefish/volle-lotte` als `:latest` und `:<tag>` pusht (benötigt die Repo-Secrets `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN`).
   - **Manuell** (mit `docker buildx build` und `--platform linux/amd64,linux/arm64`, falls die CPU-Architektur des Hosts von deinem Entwicklungsrechner abweicht):

     ```bash
     docker login
     docker build -t <dockerhub-user>/volle-lotte:latest .
     docker push <dockerhub-user>/volle-lotte:latest
     ```

2. Auf dem Host das Datenverzeichnis anlegen. Der Container läuft als Benutzer `node` (uid 1000), das Verzeichnis muss für ihn beschreibbar sein:

   ```bash
   mkdir -p /opt/volle-lotte/data && chown 1000:1000 /opt/volle-lotte/data
   ```

3. In Portainer: **Stacks → Add stack**, `docker-compose.portainer.yml` einfügen (oder auf die Git-URL dieses Repos mit diesem Compose-Pfad zeigen). Unter **Environment variables** setzen:

   | Variable          | Standard   | Zweck                                                                                           |
   | ----------------- | ---------- | ----------------------------------------------------------------------------------------------- |
   | `PRIMENG_LICENSE` | _(keiner)_ | [PrimeUI](https://primeng.dev/configuration#license)-Schlüssel, ausgeliefert über `/api/config` |
   | `DOCKERHUB_USER`  | `walefish` | nur, wenn du in einen anderen Account pushst                                                    |
   | `TAG`             | `latest`   | Image-Tag für das Deployment                                                                    |
   | `PORT`            | `8080`     | Host-Port                                                                                       |

4. Deployen und den Reverse Proxy (https://volle-lotte.allwang.family) vor den Host-Port schalten. Er **muss WebSocket-Upgrades** für `/socket.io` erlauben.

Neu deployen nach einem neuen Image: **Stacks → dein Stack → Pull and redeploy** (oder `docker compose pull && docker compose up -d`). Die Datenbank sicherst du durch Kopieren von `/opt/volle-lotte/data`.
