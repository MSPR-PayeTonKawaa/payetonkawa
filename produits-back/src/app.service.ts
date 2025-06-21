import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  getServiceInfo() {
    return {
      service: 'PayeTonKawa - API Produits',
      version: '1.0.0',
      status: 'running',
      description: 'Microservice de gestion des produits et stocks',
      database: {
        type: 'PostgreSQL',
        port: 5434,
        database: 'products_db'
      },
      endpoints: {
        products: '/products',
        search: '/products/search',
        categories: '/products/categories',
        alerts: '/products/alerts/stock',
        health: '/health',
        docs: '/api-docs'
      },
      gateway: 'http://localhost:3000/api/products',
      features: [
        'Gestion complète du catalogue produits',
        'Gestion intelligente des stocks',
        'Alertes automatiques de stock',
        'Recherche avancée et filtres',
        'Catégorisation des produits',
        'Gestion des prix et promotions'
      ]
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
      service: 'products-api',
      database: 'PostgreSQL:5434/products_db',
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      features: {
        stock_management: 'active',
        search_engine: 'active', 
        price_monitoring: 'active',
        category_management: 'active'
      }
    };
  }
}
