import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SocketService } from './socket.service';

/** Lets signed-in users pass, resumes a stored session once, else goes to the nickname screen. */
export const sessionGuard: CanActivateFn = async () => {
  const socket = inject(SocketService);
  const router = inject(Router); // must be injected before the first await
  if (socket.session() || (await socket.resume())) return true;
  return router.createUrlTree(['/nickname']);
};
