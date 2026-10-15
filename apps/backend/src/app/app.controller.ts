import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Runtime config for the SPA. The PrimeNG key is checked in the browser, so it is not a secret. */
  @Get('config')
  config() {
    return { primengLicense: process.env['PRIMENG_LICENSE'] || undefined };
  }

  @Get()
  getData() {
    return this.appService.getData();
  }
}
