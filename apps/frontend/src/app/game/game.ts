import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LeaveGame } from '../core/leave-game';
import { SocketService } from '../core/socket.service';
import { GameLobby } from '../game-lobby/game-lobby';
import { Table } from '../table/table';

/** Route `game/:id`: shows the lobby before the start, the table (with the result modal at the end) after it. */
@Component({
  selector: 'app-game',
  imports: [GameLobby, Table],
  template: `
    @if (socket.game(); as game) {
      @if (game.phase === 'lobby') {
        <app-game-lobby />
      } @else {
        <app-table />
      }
    }
  `,
})
export class Game {
  protected readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly leave = inject(LeaveGame);

  constructor() {
    effect(() => {
      if (!this.socket.game() && !this.leave.leaving()) void this.router.navigateByUrl('/lobby');
    });
  }
}
