import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  getHealth() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      }
    };
  }

  async checkAllServices() {
    const results = {
      gateway: 'healthy',
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Vérification du service Clients
    results.services['clients'] = await this.checkService(
      process.env.CLIENTS_API_URL || 'http://localhost:3001',
      'clients'
    );

    // Vérification du service Produits
    results.services['produits'] = await this.checkService(
      process.env.PRODUITS_API_URL || 'http://localhost:3002',
      'produits'
    );

    // Vérification du service Commandes
    results.services['commandes'] = await this.checkService(
      process.env.COMMANDES_API_URL || 'http://localhost:3003',
      'commandes'
    );

    // Vérification de RabbitMQ
    results.services['rabbitmq'] = await this.checkRabbitMQ();

    return results;
  }

  private async checkService(url: string, serviceName: string) {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${url}/health`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'PayeTonKawa-Gateway-HealthCheck'
        }
      });

      const responseTime = Date.now() - startTime;

      return {
        status: response.status === 200 ? 'healthy' : 'degraded',
        responseTime,
        url,
        statusCode: response.status,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.warn(`Health check failed for ${serviceName}: ${error.message}`);
      
      return {
        status: 'unhealthy',
        responseTime,
        url,
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  private async checkRabbitMQ() {
    try {
      const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5673';
      
      // Simulation de check RabbitMQ (en réalité on devrait utiliser amqplib)
      // Pour l'instant on check juste le management API
      const managementUrl = 'http://localhost:15673/api/overview';
      
      const response = await axios.get(managementUrl, {
        timeout: 5000,
        auth: {
          username: 'guest',
          password: 'guest'
        }
      });

      return {
        status: response.status === 200 ? 'healthy' : 'degraded',
        url: rabbitUrl,
        managementUrl,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      this.logger.warn(`RabbitMQ health check failed: ${error.message}`);
      
      return {
        status: 'unhealthy',
        url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5673',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  getMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime: uptime,
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024) // MB
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
      }
      // TODO: Ajouter des métriques sur les requêtes HTTP une fois qu'on aura des interceptors
    };
  }
} 