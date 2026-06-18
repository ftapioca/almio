import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  getHealth() {
    return {
      success: true,
      data: this.healthService.getLiveness(),
    };
  }

  @Get('live')
  @Public()
  getLiveness() {
    return {
      success: true,
      data: this.healthService.getLiveness(),
    };
  }

  @Get('ready')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getReadiness() {
    const readiness = await this.healthService.getReadiness();
    if (readiness.status !== 'ready') {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'SERVICE_NOT_READY',
          message: 'Service dependencies are not ready',
          details: readiness,
        },
      });
    }

    return {
      success: true,
      data: readiness,
    };
  }
}
