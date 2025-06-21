import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServiceInfo(): any {
    return {
      service: 'PayeTonKawa - API Commandes',
      version: '1.0.0',
      status: 'running',
      description: 'Microservice de gestion des commandes et du workflow métier',
      database: {
        type: 'PostgreSQL',
        port: parseInt(process.env.DB_PORT || '5435'),
        database: process.env.DB_NAME || 'commandes_db',
      },
      endpoints: {
        orders: '/orders',
        stats: '/orders/stats',
        customerOrders: '/orders/customers/:customerId',
        health: '/health',
        docs: '/api-docs',
      },
      gateway: 'http://localhost:3000/api/orders',
      features: [
        'Gestion complète du cycle de vie des commandes',
        'Validation métier et transitions de statut',
        'Calcul automatique des totaux',
        'Statistiques et reporting avancés',
        'Filtrage et recherche multicritères',
        'Intégration avec les services Clients et Produits',
        'Événements métier pour synchronisation',
        'Gestion des workflows de commande'
      ],
    };
  }

  getHealth(): any {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime * 1000), // en millisecondes
      version: '1.0.0',
      service: 'orders-api',
      database: `PostgreSQL:${process.env.DB_PORT || 5435}/${process.env.DB_NAME || 'commandes_db'}`,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
      features: {
        order_management: 'active',
        status_workflow: 'active',
        statistics: 'active',
        inter_service_communication: 'ready',
      },
    };
  }
}
