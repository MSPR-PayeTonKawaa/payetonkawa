import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('🏠 Service Info')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Informations du service',
    description: 'Récupère les informations générales du service Commandes'
  })
  @ApiResponse({
    status: 200,
    description: 'Informations du service',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string' },
        version: { type: 'string' },
        status: { type: 'string' },
        endpoints: { type: 'object' },
        features: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  getServiceInfo() {
    return this.appService.getServiceInfo();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Vérification de santé du service',
    description: 'Endpoint de health check pour monitoring'
  })
  @ApiResponse({
    status: 200,
    description: 'Service en bonne santé',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
        version: { type: 'string' },
        database: { type: 'string' },
        memory: { type: 'object' }
      }
    }
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
