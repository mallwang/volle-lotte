import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { defaultSetup } from '../core/setup';
import { StartQuestionDialog } from './start-question-dialog';

async function open() {
  TestBed.configureTestingModule({
    imports: [StartQuestionDialog],
    providers: [providePrimeNG()],
  });
  const fixture = TestBed.createComponent(StartQuestionDialog);
  fixture.componentRef.setInput('visible', true);
  fixture.componentRef.setInput('setup', {
    ...defaultSetup(),
    computers: [{ seat: 1, difficulty: 'easy', risk: 'none' }],
  });
  const events: string[] = [];
  fixture.componentInstance.startAnyway.subscribe(() => events.push('start'));
  fixture.componentInstance.saveFirst.subscribe(() => events.push('save'));
  await fixture.whenStable();
  const button = (text: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('p-dialog button')].find(
      (b) => b.textContent?.trim() === text,
    )!;
  return { fixture, events, button };
}

describe('StartQuestionDialog', () => {
  it('shows the question and a summary of the setup', async () => {
    await open();
    expect(document.body.textContent).toContain('Save this setup as a preset?');
    expect(document.body.textContent).toContain('4 seats · target 6000 · computers: 1 · speed 3');
  });

  it('offers start and save and reports the choice', async () => {
    const { button, events } = await open();
    button('No, start the game').click();
    button('Save as preset').click();
    expect(events).toEqual(['start', 'save']);
  });

  it('closes on "Back" without a choice', async () => {
    const { button, events, fixture } = await open();
    button('Back').click();
    expect(fixture.componentInstance.visible()).toBe(false);
    expect(events).toEqual([]);
  });
});
