import { Component, computed, inject, input } from '@angular/core';
import { playerSeats } from 'client-core';
import type { GameView } from 'game-rules';
import { MobileI18nService } from '../core/i18n.service';
import { TranslatePipe } from '../core/translate.pipe';

/** Player names are capped so a long nickname never pushes the score off screen. */
const NAME_MAX = 20;

/** One row per seat in table order; the active seat shows border, ▶ and fill, not colour alone. */
@Component({
  selector: 'app-table-players',
  imports: [TranslatePipe],
  template: `
    <ol [attr.aria-label]="'mobile.table.players' | t">
      @for (p of rows(); track $index) {
        <li [class.active]="p.active" [class.off]="!p.online" [class.gone]="p.gone">
          <span class="mark" aria-hidden="true">{{ p.active ? '▶' : '' }}</span>
          <span class="name" [title]="p.title">{{ p.name }}</span>
          <strong class="score">{{ p.score }}</strong>
          <small class="tags">
            @if (p.active) {
              <span class="vl-sr-only">{{ 'mobile.table.activeSeat' | t }}</span>
            }
            {{ p.tags }}
          </small>
        </li>
      }
    </ol>
  `,
  styles: `
    ol {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0;
      margin: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template: 'm n s' auto 't t t' auto / 1rem 1fr auto;
      align-items: center;
      padding: 4px 6px;
      border: 2px solid var(--vl-line);
      border-radius: 8px;
      background: var(--vl-surface);
    }
    li.active {
      border-width: 4px;
      padding: 2px 4px;
      border-color: var(--vl-accent);
      background: var(--vl-butter);
      color: var(--vl-on-butter);
    }
    .name {
      grid-area: n;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mark {
      grid-area: m;
    }
    .score {
      grid-area: s;
    }
    .tags {
      grid-area: t;
      color: inherit;
      opacity: 0.8;
    }
    .tags:empty {
      display: none;
    }
    .off {
      opacity: 0.6;
    }
    .gone .name {
      text-decoration: line-through;
    }
    .vl-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  `,
})
export class TablePlayers {
  private readonly i18n = inject(MobileI18nService);
  readonly view = input.required<GameView>();
  /** While a result is shown the state is past that turn: this engine index stays active. */
  readonly activeIndex = input<number | null>(null);

  protected readonly rows = computed(() => {
    const g = this.view();
    const state = g.game;
    if (!state) return [];
    const seats = playerSeats(g);
    const active = this.activeIndex() ?? state.current;
    return state.players.map((p, i) => {
      const seat = g.seats[seats[i]];
      const computer = seat?.state === 'computer';
      const former = computer ? seat.former?.nickname : undefined;
      const gone = !seat || (seat.state !== 'human' && seat.state !== 'computer');
      const t = (k: string, params?: Record<string, string>) => this.i18n.t(k, params);
      const tags = [
        seats[i] === g.you.seat && t('gameOver.you'),
        former
          ? t('mobile.table.replaced', { name: former })
          : computer && t('mobile.table.computer'),
        seat?.connected === false && t('mobile.table.offline'),
        gone && t('mobile.table.gone'),
      ];
      return {
        name: (computer ? p.name : (seat?.nickname ?? p.name)).slice(0, NAME_MAX),
        score: p.score,
        active: i === active,
        online: seat?.connected !== false,
        gone,
        title: former ?? '',
        tags: tags.filter(Boolean).join(' · '),
      };
    });
  });
}
