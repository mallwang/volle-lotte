import { Module } from '@nestjs/common';
import { GameRegistryService } from './game-registry.service';
import { LobbyGateway } from './lobby.gateway';
import { SessionsService } from './sessions.service';

@Module({
  providers: [
    { provide: SessionsService, useFactory: () => new SessionsService() },
    GameRegistryService,
    LobbyGateway,
  ],
})
export class LobbyModule {}
