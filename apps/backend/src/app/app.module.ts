import { Module } from '@nestjs/common';
import { LobbyModule } from './lobby/lobby.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [LobbyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
