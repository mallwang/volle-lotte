import { Component, computed, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DicePrefs } from '../core/dice-prefs';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

/** Table settings. Skip-animation is a local device preference. */
@Component({
  selector: 'app-settings-dialog',
  imports: [DialogModule, FormsModule, ToggleSwitchModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'settings.title' | t"
      [style]="{ width: '28rem', maxWidth: '95vw' }"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
    >
      <p class="vl-setting-subtitle">{{ 'settings.subtitle' | t }}</p>
      <div class="vl-setting">
        <div class="vl-setting-row">
          <label for="skip-dice">{{ 'settings.skipDice' | t }}</label>
          <p-toggleswitch
            inputId="skip-dice"
            [ngModel]="prefs.skip()"
            (ngModelChange)="prefs.setSkip($event)"
          />
        </div>
        <small>{{ 'settings.skipDiceHint' | t }}</small>
      </div>
      <div class="vl-setting">
        <div class="vl-setting-row">
          <label for="fast-computer-dice">{{ 'settings.fastComputerDice' | t }}</label>
          <p-toggleswitch
            inputId="fast-computer-dice"
            [ngModel]="socket.game()?.fastComputerDice ?? false"
            [disabled]="!isHost()"
            (ngModelChange)="socket.settings($event)"
          />
        </div>
        <small>{{ (isHost() ? 'settings.fastComputerDiceHint' : 'settings.hostOnly') | t }}</small>
      </div>
    </p-dialog>
  `,
})
export class SettingsDialog {
  readonly visible = model(false);
  protected readonly prefs = inject(DicePrefs);
  protected readonly socket = inject(SocketService);
  protected readonly isHost = computed(() => {
    const g = this.socket.game();
    return !!g && g.hostId === g.you.playerId;
  });
}
