import { Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { LeaveGame } from '../core/leave-game';
import { SocketService } from '../core/socket.service';
import { Sounds } from '../core/sounds';
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
  private readonly sounds = inject(Sounds);

  constructor() {
    // the first phase seen is only a baseline, so opening or reloading a running game stays silent
    let phase: string | undefined;
    effect(() => {
      const next = this.socket.game()?.phase;
      untracked(() => {
        if (phase === 'lobby' && next === 'running') this.sounds.play('game-start');
        phase = next;
      });
    });
    effect(() => {
      if (!this.socket.game() && !this.leave.leaving()) void this.router.navigateByUrl('/lobby');
    });
  }
}
