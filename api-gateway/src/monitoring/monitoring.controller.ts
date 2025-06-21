import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { RabbitMQMetricsService } from './rabbitmq-metrics.service';
import { JwtAuthGuard, Roles } from '../auth/jwt.guard';

@ApiTags('📊 Monitoring MSPR814')
@Controller('api/monitoring')
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly rabbitMQMetricsService: RabbitMQMetricsService,
  ) {}

  @Get('test')
  @ApiOperation({
    summary: 'Test simple du controller',
    description: 'Route de test pour vérifier que le controller fonctionne'
  })
  testController() {
    return { 
      message: 'Controller monitoring fonctionne !', 
      timestamp: new Date().toISOString() 
    };
  }

  @Get('metrics/http')
  @ApiOperation({
    summary: 'Métriques HTTP (MSPR814)',
    description: 'Statistiques détaillées des appels HTTP : nombre d\'appels par API, codes de retour, temps de réponse'
  })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Période (5m, 1h, 24h)', example: '1h' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques HTTP détaillées',
    schema: {
      type: 'object',
      properties: {
        totalRequests: { type: 'number', description: 'Nombre total d\'appels HTTP' },
        successfulRequests: { type: 'number', description: 'Appels réussis (2xx-3xx)' },
        failedRequests: { type: 'number', description: 'Appels échoués (4xx-5xx)' },
        averageResponseTime: { type: 'number', description: 'Temps de réponse moyen (ms)' },
        requestsByStatusCode: { 
          type: 'object', 
          description: 'Répartition par code HTTP',
          example: { '200': 150, '404': 5, '500': 2 }
        },
        requestsByEndpoint: { 
          type: 'object', 
          description: 'Nombre d\'appels par endpoint',
          example: { '/api/customers': 45, '/api/products': 30 }
        },
        requestsByService: { 
          type: 'object', 
          description: 'Nombre d\'appels par service',
          example: { 'clients': 45, 'produits': 30, 'commandes': 25 }
        }
      }
    }
  })
  getHttpMetrics(@Query('timeRange') timeRange?: string): any {
    return this.metricsService.getHttpStats(timeRange);
  }

  @Get('metrics/rabbitmq')
  @ApiOperation({
    summary: 'Métriques RabbitMQ (MSPR814)',
    description: 'Nombre de messages échangés sur le message broker par file d\'attente'
  })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Période (5m, 1h, 24h)', example: '1h' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques RabbitMQ détaillées',
    schema: {
      type: 'object',
      properties: {
        totalMessages: { type: 'number', description: 'Nombre total de messages' },
        messagesByQueue: {
          type: 'object',
          description: 'Messages par queue',
          example: {
            'customer.events': { sent: 15, received: 15, inQueue: 0, consumers: 2 },
            'product.events': { sent: 8, received: 8, inQueue: 1, consumers: 1 }
          }
        },
        lastUpdate: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getRabbitMQMetrics(@Query('timeRange') timeRange?: string) {
    // Utiliser le service RabbitMQ dédié pour des métriques plus précises
    return await this.rabbitMQMetricsService.getPayeTonKawaMetrics();
  }

  @Get('rabbitmq/queues')
  @ApiOperation({
    summary: 'Détail des queues RabbitMQ (MSPR814)',
    description: 'Métriques détaillées de toutes les queues avec statistiques par queue'
  })
  @ApiResponse({
    status: 200,
    description: 'Métriques détaillées des queues RabbitMQ',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        summary: {
          type: 'object',
          properties: {
            totalQueues: { type: 'number' },
            totalMessages: { type: 'number' },
            totalConsumers: { type: 'number' },
            averageMessagesPerQueue: { type: 'number' }
          }
        },
        queues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              queue: { type: 'string' },
              messagesInQueue: { type: 'number' },
              consumers: { type: 'number' },
              messageStats: {
                type: 'object',
                properties: {
                  published: { type: 'number' },
                  delivered: { type: 'number' },
                  acknowledged: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  })
  async getRabbitMQQueuesMetrics() {
    return await this.rabbitMQMetricsService.getQueuesMetrics();
  }

  @Get('rabbitmq/dashboard')
  @ApiOperation({
    summary: 'Dashboard RabbitMQ (MSPR814)',
    description: 'Vue d\'ensemble temps réel du message broker pour les administrateurs'
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard RabbitMQ temps réel',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
        summary: {
          type: 'object',
          properties: {
            totalQueues: { type: 'number' },
            totalMessages: { type: 'number' },
            totalConsumers: { type: 'number' },
            businessMessages: { type: 'number', description: 'Messages PayeTonKawa' }
          }
        },
        health: {
          type: 'object',
          properties: {
            rabbitmq: { type: 'boolean' },
            queuesActive: { type: 'boolean' },
            consumersActive: { type: 'boolean' }
          }
        },
        alerts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              message: { type: 'string' },
              severity: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getRabbitMQDashboard() {
    return await this.rabbitMQMetricsService.getDashboardMetrics();
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard de monitoring (MSPR814)',
    description: 'Résumé des métriques pour les administrateurs PayeTonKawa'
  })
  @ApiResponse({
    status: 200,
    description: 'Résumé du dashboard de monitoring',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', example: 'Dernière heure' },
        timestamp: { type: 'string', format: 'date-time' },
        http: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number' },
            successRate: { type: 'number', description: 'Pourcentage de succès' },
            averageResponseTime: { type: 'number', description: 'Temps moyen (ms)' },
            slowRequests: { type: 'number', description: 'Requêtes lentes' },
            errorRequests: { type: 'number', description: 'Requêtes en erreur' }
          }
        },
        rabbitmq: {
          type: 'object',
          properties: {
            totalMessages: { type: 'number' },
            activeQueues: { type: 'number' },
            messagesInQueues: { type: 'number' }
          }
        },
        alerts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              message: { type: 'string' },
              severity: { type: 'string', enum: ['info', 'warning', 'critical'] }
            }
          }
        }
      }
    }
  })
  getDashboard() {
    return this.metricsService.getDashboardSummary();
  }

  @Get('detailed')
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Métriques détaillées (Admin)',
    description: 'Toutes les métriques pour Grafana/Prometheus - Accès administrateur requis'
  })
  @ApiResponse({
    status: 200,
    description: 'Métriques complètes pour monitoring avancé',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        http: { type: 'object', description: 'Métriques HTTP détaillées' },
        rabbitmq: { type: 'object', description: 'Métriques RabbitMQ détaillées' },
        system: { type: 'object', description: 'Métriques système' },
        performance: { type: 'object', description: 'Métriques de performance' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Token JWT requis' })
  @ApiResponse({ status: 403, description: 'Droits administrateur requis' })
  getDetailedMetrics() {
    return this.metricsService.getDetailedMetrics();
  }

  @Get('health/services')
  @ApiOperation({
    summary: 'État des services (MSPR814)',
    description: 'Vérification de la connectivité avec tous les microservices'
  })
  @ApiResponse({
    status: 200,
    description: 'État de santé de tous les services',
    schema: {
      type: 'object',
      properties: {
        gateway: { type: 'string', example: 'healthy' },
        services: {
          type: 'object',
          properties: {
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
            }
          }
        },
        rabbitmq: { 
          type: 'object',
          properties: {
            status: { type: 'string' },
            url: { type: 'string' }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalServices: { type: 'number' },
            healthyServices: { type: 'number' },
            degradedServices: { type: 'number' },
            unhealthyServices: { type: 'number' }
          }
        }
      }
    }
  })
  async getServicesHealth() {
    // Réutiliser la logique du HealthService mais avec plus de détails
    const clientsUrl = process.env.CLIENTS_API_URL || 'http://localhost:3001';
    const produitsUrl = process.env.PRODUITS_API_URL || 'http://localhost:3002';
    const commandesUrl = process.env.COMMANDES_API_URL || 'http://localhost:3003';

    const [clientsHealth, produitsHealth, commandesHealth] = await Promise.allSettled([
      this.checkServiceHealth(clientsUrl, 'clients'),
      this.checkServiceHealth(produitsUrl, 'produits'),
      this.checkServiceHealth(commandesUrl, 'commandes')
    ]);

    const services = {
      clients: clientsHealth.status === 'fulfilled' ? clientsHealth.value : { status: 'unhealthy', error: 'Service unreachable' },
      produits: produitsHealth.status === 'fulfilled' ? produitsHealth.value : { status: 'unhealthy', error: 'Service unreachable' },
      commandes: commandesHealth.status === 'fulfilled' ? commandesHealth.value : { status: 'unhealthy', error: 'Service unreachable' }
    };

    // Vérification RabbitMQ
    const rabbitmq = await this.checkRabbitMQHealth();

    // Résumé
    const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
    const degradedServices = Object.values(services).filter(s => s.status === 'degraded').length;
    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy').length;

    return {
      gateway: 'healthy',
      timestamp: new Date().toISOString(),
      services,
      rabbitmq,
      summary: {
        totalServices: 3,
        healthyServices,
        degradedServices,
        unhealthyServices
      }
    };
  }

  // Méthodes privées utilitaires
  
  private async checkServiceHealth(url: string, serviceName: string) {
    const startTime = Date.now();
    
    try {
      const axios = require('axios');
      const response = await axios.get(`${url}/health`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'PayeTonKawa-Monitoring'
        }
      });

      const responseTime = Date.now() - startTime;

      return {
        status: response.status === 200 ? 'healthy' : 'degraded',
        responseTime,
        url,
        statusCode: response.status,
        lastCheck: new Date().toISOString(),
        service: serviceName
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        url,
        error: error.message,
        lastCheck: new Date().toISOString(),
        service: serviceName
      };
    }
  }

  private async checkRabbitMQHealth() {
    try {
      const axios = require('axios');
      const managementUrl = 'http://localhost:15672/api/overview';
      
      const response = await axios.get(managementUrl, {
        timeout: 5000,
        auth: {
          username: 'guest',
          password: 'guest'
        }
      });

      return {
        status: response.status === 200 ? 'healthy' : 'degraded',
        url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
        managementUrl,
        lastCheck: new Date().toISOString(),
        version: response.data?.rabbitmq_version || 'unknown'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
} 