import { Component, inject } from '@angular/core';
import { SocketService } from '../core/socket.service';

@Component({
  selector: 'app-result',
  template: `
    @if (socket.game(); as view) {
      <h2>Result</h2>
      @if (view.game?.result; as result) {
        <ol>
          @for (r of result.ranking; track r.rank) {
            <li [value]="r.rank">
              Rank {{ r.rank }}:
              @for (i of r.players; track i; let last = $last) {
                {{ view.game!.players[i].name }} ({{ view.game!.players[i].score }}){{
                  last ? '' : ','
                }}
              }
            </li>
          }
        </ol>
      }
      <button type="button" (click)="socket.leave()">Back to lobby</button>
    }
  `,
})
export class Result {
  protected readonly socket = inject(SocketService);
}
