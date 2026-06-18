import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class ExceptionLoggingFilter implements ExceptionFilter {
  private readonly logger = new Logger(ExceptionLoggingFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const http = host.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    this.logger.error(
      JSON.stringify({
        event: 'http_request_failed',
        requestId: request.requestId ?? null,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode,
        tenantId: request.tenant?.id ?? null,
        tenantSlug: request.tenant?.slug ?? null,
        userId: request.user?.id ?? null,
        errorName: exception instanceof Error ? exception.name : 'UnknownError',
        errorMessage:
          exception instanceof Error ? exception.message : 'Unhandled exception',
      }),
      exception instanceof Error ? exception.stack : undefined,
    );

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      response.status(statusCode).json(payload);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}
