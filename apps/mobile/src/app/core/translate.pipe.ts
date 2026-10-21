import { Pipe, PipeTransform, inject } from '@angular/core';
import { MobileI18nService } from './i18n.service';

/** `{{ 'key' | t: { n: 1 } }}`; impure so it re-evaluates when the language signal changes. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(MobileI18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
