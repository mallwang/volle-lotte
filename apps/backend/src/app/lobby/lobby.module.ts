import { Module } from '@nestjs/common';
import { GameRegistryService } from './game-registry.service';
import { LobbyGateway } from './lobby.gateway';
import { SessionsService } from './sessions.service';
import { ViewSyncService } from './view-sync.service';

@Module({
  providers: [
    { provide: SessionsService, useFactory: () => new SessionsService() },
    GameRegistryService,
    ViewSyncService,
    LobbyGateway,
  ],
})
export class LobbyModule {}
