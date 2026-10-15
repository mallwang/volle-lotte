import type { ErrorAck, ErrorReason } from 'game-rules';

const TEXT: Record<ErrorReason, string> = {
  noSession: 'Your session has ended. Please enter your nickname again.',
  versionMismatch: 'This app version does not match the server. Please reload the page.',
  invalidRequest: 'The request was not valid.',
  invalidNickname: 'Nickname must have 2-20 characters: letters, digits, space, _ or -.',
  nicknameTaken: 'This nickname is already used in the game. Choose another one.',
  invalidPassword: 'Password must have 4-64 characters.',
  wrongPassword: 'Wrong password.',
  locked: 'Too many attempts.',
  gameNotFound: 'The game no longer exists.',
  gameStarted: 'The game has already started.',
  gameFull: 'The game is full.',
  seatNotFree: 'This seat is not free.',
  seatOccupied: 'An occupied seat cannot be locked.',
  alreadyInGame: 'You are already in a game.',
  notInGame: 'You are not in a game.',
  notHost: 'Only the host can do this.',
  notReady: 'Not all players are ready.',
  notEnoughPlayers: 'At least two players are needed.',
  nothingPending: 'There is nothing to decide.',
  notYourTurn: 'It is not your turn.',
  paused: 'The game waits for the host.',
  rejected: 'That move is not allowed.',
};

export function errorMessage(ack: ErrorAck): string {
  if (ack.reason === 'wrongPassword' && ack.attemptsLeft !== undefined)
    return `Wrong password. ${ack.attemptsLeft} attempts left.`;
  if (ack.reason === 'locked' && ack.retryAfterMs !== undefined)
    return `Too many attempts. Try again in ${Math.ceil(ack.retryAfterMs / 1000)} s.`;
  if (ack.reason === 'rejected' && ack.engine) return `That move is not allowed (${ack.engine}).`;
  return TEXT[ack.reason];
}
