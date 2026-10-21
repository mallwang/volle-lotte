import type { Routes } from '@angular/router';

/** Screens are added with their user stories; unknown paths fall back to the game list. */
export const routes: Routes = [{ path: '**', redirectTo: '' }];
