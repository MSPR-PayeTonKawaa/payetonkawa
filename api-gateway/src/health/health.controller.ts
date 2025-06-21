import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('📊 Monitoring')
@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check principal',
    description: 'Vérifie l\'état de santé de l\'API Gateway'
  })
  @ApiResponse({
    status: 200,
    description: 'API Gateway en bonne santé',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
        version: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'API Gateway en état dégradé'
  })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('services')
  @ApiOperation({
    summary: 'Health check des microservices',
    description: 'Vérifie la connectivité avec tous les microservices'
  })
  @ApiResponse({
    status: 200,
    description: 'État de santé de tous les services',
    schema: {
      type: 'object',
      properties: {
        gateway: { type: 'string' },
        clients: { 
          type: 'object',
          properties: {
            status: { type: 'string' },
            responseTime: { type: 'number' },
            url: { type: 'string' }
          }
        },
        produits: { 
          type: 'object',
          properties: {
            status: { type: 'string' },
            responseTime: { type: 'number' },
            url: { type: 'string' }
          }
        },
        commandes: { 
          type: 'object',
          properties: {
            status: { type: 'string' },
            responseTime: { type: 'number' },
            url: { type: 'string' }
          }
        },
        rabbitmq: { 
          type: 'object',
          properties: {
            status: { type: 'string' },
            url: { type: 'string' }
          }
        }
      }
    }
  })
  async getServicesHealth() {
    return this.healthService.checkAllServices();
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Métriques de l\'API Gateway',
    description: 'Retourne les métriques de performance et d\'utilisation'
  })
  @ApiResponse({
    status: 200,
    description: 'Métriques détaillées',
    schema: {
      type: 'object',
      properties: {
        requests: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            averageResponseTime: { type: 'number' }
          }
        },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number' },
            total: { type: 'number' },
            percentage: { type: 'number' }
          }
        },
        cpu: {
          type: 'object',
          properties: {
            usage: { type: 'number' }
          }
        }
      }
    }
  })
  getMetrics() {
    return this.healthService.getMetrics();
  }
} 