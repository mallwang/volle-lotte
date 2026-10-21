import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { MobileSocketService } from './mobile-socket.service';

/** Lets signed-in users pass, resumes a stored session once, else goes to the nickname screen. */
export const sessionGuard: CanActivateFn = async () => {
  const socket = inject(MobileSocketService);
  const router = inject(Router); // must be injected before the first await
  if (socket.session() || (await socket.resume())) return true;
  return router.createUrlTree(['/nickname']);
};

/** `game/:id` needs a seat in that game; otherwise back to the list. */
export const membershipGuard: CanActivateFn = (route) => {
  const game = inject(MobileSocketService).game();
  return game?.id === route.paramMap.get('id') ? true : inject(Router).createUrlTree(['/']);
};
