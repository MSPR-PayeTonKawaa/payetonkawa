import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  getServiceInfo() {
    return {
      service: 'PayeTonKawa - API Clients',
      version: '1.0.0',
      status: 'running',
      description: 'Microservice de gestion des clients',
      database: {
        type: 'PostgreSQL',
        port: 5433,
        database: 'clients_db'
      },
      endpoints: {
        customers: '/customers',
        health: '/health',
        docs: '/api-docs'
      },
      gateway: 'http://localhost:3000/api/customers'
    };
  }

  getHealth() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      version: '1.0.0',
      service: 'clients-api',
      database: 'PostgreSQL:5433/clients_db',
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      }
    };
  }
}
