import { Injectable } from '@angular/core';
import { DiceRoll } from 'client-core';

export { rollDurations } from 'client-core';

/** App-wide dice roll; the logic lives in `client-core`. */
@Injectable({ providedIn: 'root' })
export class DiceRollService extends DiceRoll {}
