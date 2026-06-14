import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
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
