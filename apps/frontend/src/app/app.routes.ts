import { Route } from '@angular/router';
import { sessionGuard } from './core/session.guard';
import { CreateGame } from './create-game/create-game';
import { Game } from './game/game';
import { Lobby } from './lobby/lobby';
import { Nickname } from './nickname/nickname';

export const appRoutes: Route[] = [
  { path: 'nickname', component: Nickname },
  { path: 'lobby', component: Lobby, canActivate: [sessionGuard] },
  { path: 'create-game', component: CreateGame, canActivate: [sessionGuard] },
  { path: 'game/:id', component: Game, canActivate: [sessionGuard] },
  { path: '**', redirectTo: 'lobby' },
];
