import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SocketService } from '../core/socket.service';

@Component({
  selector: 'app-result',
  imports: [ButtonModule, CardModule, TagModule],
  template: `
    @if (socket.game(); as view) {
      <h2>Result</h2>
      @if (view.game?.result; as result) {
        <p-card>
          <ol class="vl-ranking">
            @for (r of result.ranking; track r.rank) {
              <li [value]="r.rank">
                <p-tag
                  [value]="'Rank ' + r.rank"
                  [icon]="r.rank === 1 ? 'pi pi-trophy' : 'pi pi-user'"
                />:
                @for (i of r.players; track i; let last = $last) {
                  {{ view.game!.players[i].name }} ({{ view.game!.players[i].score }}){{
                    last ? '' : ','
                  }}
                }
              </li>
            }
          </ol>
        </p-card>
      }
      <p-button label="Back to lobby" (onClick)="socket.leave()" />
    }
  `,
})
export class Result {
  protected readonly socket = inject(SocketService);
}
