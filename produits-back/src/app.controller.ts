import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('📊 Monitoring')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Informations du service',
    description: 'Retourne les informations générales du microservice Produits'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Informations du service',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
        database: { 
          type: 'object',
          properties: {
            type: { type: 'string' },
            port: { type: 'number' },
            database: { type: 'string' }
          }
        },
        endpoints: {
          type: 'object',
          properties: {
            products: { type: 'string' },
            search: { type: 'string' },
            categories: { type: 'string' },
            alerts: { type: 'string' }
          }
        }
      }
    }
  })
  getServiceInfo() {
    return this.appService.getServiceInfo();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check du service',
    description: 'Vérifie l\'état de santé du microservice Produits'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'État de santé du service',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        uptime: { type: 'number' },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number' },
            total: { type: 'number' },
            percentage: { type: 'number' }
          }
        }
      }
    }
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
