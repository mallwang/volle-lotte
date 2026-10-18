import { Route } from '@angular/router';
import { leaveGameGuard } from './core/leave-game';
import { sessionGuard } from './core/session.guard';
import { CreateGame } from './create-game/create-game';
import { Game } from './game/game';
import { Lobby } from './lobby/lobby';
import { Nickname } from './nickname/nickname';

export const appRoutes: Route[] = [
  { path: 'nickname', component: Nickname, title: 'nickname.title' },
  { path: 'lobby', component: Lobby, title: 'lobby.title', canActivate: [sessionGuard] },
  {
    path: 'create-game',
    component: CreateGame,
    title: 'create.title',
    canActivate: [sessionGuard],
  },
  {
    path: 'game/:id',
    component: Game,
    title: 'game.title',
    canActivate: [sessionGuard],
    canDeactivate: [leaveGameGuard],
  },
  { path: '**', redirectTo: 'lobby' },
];
