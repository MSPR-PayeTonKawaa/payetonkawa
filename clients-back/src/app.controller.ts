import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('📊 Monitoring')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Point d\'entrée de l\'API Clients',
    description: 'Retourne les informations de base du service Clients'
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
        database: { type: 'string' },
        endpoints: { type: 'object' }
      }
    }
  })
  getServiceInfo() {
    return this.appService.getServiceInfo();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check du service Clients',
    description: 'Vérifie l\'état de santé du service et de la base de données'
  })
  @ApiResponse({
    status: 200,
    description: 'Service en bonne santé',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        database: { type: 'string' },
        version: { type: 'string' }
      }
    }
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
