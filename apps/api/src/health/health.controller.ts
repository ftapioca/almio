import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      success: true,
      data: {
        service: 'almio-api',
        status: 'ok',
      },
    };
  }
}
