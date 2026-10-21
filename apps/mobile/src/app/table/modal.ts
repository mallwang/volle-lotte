import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

/** Opens a native `<dialog>` modally: the browser traps focus and blocks the page behind it. */
@Directive({ selector: 'dialog[appModal]' })
export class Modal {
  constructor() {
    const dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', ''); // no <dialog> support (test DOM)
    });
  }
}
