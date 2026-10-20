import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { LeaveGame } from '../core/leave-game';
import { SocketService } from '../core/socket.service';
import { Sounds } from '../core/sounds';
import { gameView, stubSocket } from '../core/testing';
import { GameLobby } from '../game-lobby/game-lobby';
import { Table } from '../table/table';
import { Game } from './game';

@Component({ selector: 'app-game-lobby', template: '' })
class LobbyStub {}
@Component({ selector: 'app-table', template: '' })
class TableStub {}

const sounds = { play: vi.fn(), preload: vi.fn(), stop: vi.fn(), muted: signal(false) };

async function setup(phase: 'lobby' | 'running' | 'finished') {
  const socket = stubSocket(gameView({ phase }));
  TestBed.configureTestingModule({
    imports: [Game],
    providers: [
      { provide: SocketService, useValue: socket },
      { provide: LeaveGame, useValue: { leaving: signal(false) } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: Sounds, useValue: sounds },
    ],
  }).overrideComponent(Game, {
    remove: { imports: [GameLobby, Table] },
    add: { imports: [LobbyStub, TableStub] },
  });
  const fixture = TestBed.createComponent(Game);
  await fixture.whenStable();
  const change = async (next: 'lobby' | 'running' | 'finished') => {
    socket.game.set(gameView({ phase: next }));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { change };
}

describe('Game start sound', () => {
  beforeEach(() => sounds.play.mockClear());

  it('plays once when the lobby turns into a running game', async () => {
    const { change } = await setup('lobby');
    expect(sounds.play).not.toHaveBeenCalled();
    await change('running');
    expect(sounds.play).toHaveBeenCalledTimes(1);
    expect(sounds.play).toHaveBeenCalledWith('game-start');
  });

  it('stays silent when the page opens on a running game (reload)', async () => {
    const { change } = await setup('running');
    await change('running');
    expect(sounds.play).not.toHaveBeenCalled();
  });

  it('plays again for a rematch, not when the game ends', async () => {
    const { change } = await setup('lobby');
    await change('running');
    await change('finished');
    expect(sounds.play).toHaveBeenCalledTimes(1);
    await change('lobby');
    await change('running');
    expect(sounds.play).toHaveBeenCalledTimes(2);
  });
});
