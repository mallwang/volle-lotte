import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../core/socket.service';
import { GameLobby } from '../game-lobby/game-lobby';
import { Result } from '../result/result';
import { Table } from '../table/table';

/** Route `game/:id`: shows the lobby, table or result view depending on the phase. */
@Component({
  selector: 'app-game',
  imports: [GameLobby, Table, Result],
  template: `
    @if (socket.game(); as game) {
      @switch (game.phase) {
        @case ('lobby') {
          <app-game-lobby />
        }
        @case ('running') {
          <app-table />
        }
        @default {
          <app-result />
        }
      }
    }
  `,
})
export class Game {
  protected readonly socket = inject(SocketService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (!this.socket.game()) void this.router.navigateByUrl('/lobby');
    });
  }
}
