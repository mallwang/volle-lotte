import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SliderModule } from 'primeng/slider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { isHost } from '../core/game-view';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

/** Quiet time after the last slider change before it is sent, so a drag is one intent and one toast. */
const SEND_DELAY_MS = 300;

/** Shared host controls in the lobby panel and table dialog. */
@Component({
  selector: 'app-host-settings',
  imports: [FormsModule, SliderModule, ToggleSwitchModule, TranslatePipe],
  template: `
    @if (socket.game(); as game) {
      <div class="vl-setting">
        <div class="vl-setting-row">
          <span id="host-speed-label">{{ 'settings.computerSpeed' | t }}</span>
          <strong aria-live="polite">{{
            'settings.computerSpeedValue' | t: { step: speed(), name: speedName() }
          }}</strong>
        </div>
        <p-slider
          [ngModel]="speed()"
          [min]="1"
          [max]="5"
          [step]="1"
          ariaLabelledBy="host-speed-label"
          [disabled]="!host()"
          (ngModelChange)="changeSpeed($event)"
        />
        <div class="vl-scale" aria-hidden="true">
          <span>1 {{ 'settings.scaleSlow' | t }}</span>
          <span>3 {{ 'settings.scaleDefault' | t }}</span>
          <span>5 {{ 'settings.scaleFast' | t }}</span>
        </div>
        <small>{{ (host() ? 'settings.computerSpeedHint' : 'settings.hostOnly') | t }}</small>
      </div>
      <div class="vl-setting">
        <div class="vl-setting-row">
          <label for="fast-computer-dice">{{ 'settings.fastComputerDice' | t }}</label>
          <p-toggleswitch
            inputId="fast-computer-dice"
            [ngModel]="game.fastComputerDice"
            [disabled]="!host()"
            (ngModelChange)="socket.settings({ fastComputerDice: $event })"
          />
        </div>
        <small>{{ (host() ? 'settings.fastComputerDiceHint' : 'settings.hostOnly') | t }}</small>
      </div>
      <div class="vl-setting">
        <div class="vl-setting-row">
          <label for="show-bust-probability">{{ 'settings.showBustProbability' | t }}</label>
          <p-toggleswitch
            inputId="show-bust-probability"
            [ngModel]="game.showBustProbability"
            [disabled]="!host()"
            (ngModelChange)="socket.settings({ showBustProbability: $event })"
          />
        </div>
        <small>{{ (host() ? 'settings.showBustProbabilityHint' : 'settings.hostOnly') | t }}</small>
      </div>
    }
  `,
})
export class HostSettings implements OnDestroy {
  protected readonly socket = inject(SocketService);
  private readonly i18n = inject(I18nService);
  /** Value shown while dragging or waiting for the server; null follows the server value. */
  private readonly local = signal<number | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  protected readonly host = computed(() => {
    const g = this.socket.game();
    return !!g && isHost(g);
  });
  private readonly server = computed(() => this.socket.game()?.computerSpeed ?? 3);
  protected readonly speed = computed(() => this.local() ?? this.server());
  protected readonly speedName = computed(() => {
    this.i18n.lang();
    return this.i18n.t(`settings.computerSpeed.${this.speed()}`);
  });

  constructor() {
    // the server value wins again once nothing is waiting to be sent
    effect(() => {
      this.server();
      if (this.timer === undefined) this.local.set(null);
    });
  }

  protected changeSpeed(value: number): void {
    this.local.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.send(value), SEND_DELAY_MS);
  }

  private async send(value: number): Promise<void> {
    this.timer = undefined;
    const ack = await this.socket.settings({ computerSpeed: value });
    if (!ack?.ok || this.server() === value) this.local.set(null);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
