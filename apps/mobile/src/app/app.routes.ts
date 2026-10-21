import type { Routes } from '@angular/router';
import { sessionGuard } from './core/session.guard';

/** Screens are added with their user stories; unknown paths fall back to the game list. */
export const routes: Routes = [
  { path: 'nickname', loadComponent: () => import('./nickname/nickname').then((m) => m.Nickname) },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [sessionGuard],
    loadComponent: () => import('./list/list').then((m) => m.List),
  },
  { path: '**', redirectTo: '' },
];
