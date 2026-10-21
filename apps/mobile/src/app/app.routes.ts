import type { Routes } from '@angular/router';
import { membershipGuard, sessionGuard } from './core/session.guard';

/** Screens are added with their user stories; unknown paths fall back to the game list. */
export const routes: Routes = [
  { path: 'nickname', loadComponent: () => import('./nickname/nickname').then((m) => m.Nickname) },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [sessionGuard],
    loadComponent: () => import('./list/list').then((m) => m.List),
  },
  {
    path: 'create',
    canActivate: [sessionGuard],
    loadComponent: () => import('./create-game/create-game').then((m) => m.CreateGame),
  },
  {
    path: 'game/:id',
    canActivate: [sessionGuard, membershipGuard],
    loadComponent: () => import('./game-lobby/game-lobby').then((m) => m.GameLobby),
  },
  {
    path: 'started',
    canActivate: [sessionGuard],
    loadComponent: () => import('./started/started').then((m) => m.Started),
  },
  { path: '**', redirectTo: '' },
];
