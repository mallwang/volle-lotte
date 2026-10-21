import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../core/translate.pipe';

/** The phone game table is not built yet (FR-013); point to the desktop site. */
@Component({
  selector: 'app-started',
  imports: [RouterLink, TranslatePipe],
  template: `
    <h2>{{ 'mobile.started.title' | t }}</h2>
    <p>{{ 'mobile.started.body' | t }}</p>
    <a routerLink="/" class="button primary">{{ 'mobile.started.back' | t }}</a>
  `,
})
export class Started {}
