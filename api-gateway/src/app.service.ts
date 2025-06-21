import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome() {
    return {
      message: 'Bienvenue sur l\'API Gateway PayeTonKawa',
      description: 'Architecture microservices pour la gestion du café',
      version: '1.0.0',
      documentation: '/api-docs',
      services: {
        clients: process.env.CLIENTS_API_URL || 'http://localhost:3001',
        produits: process.env.PRODUITS_API_URL || 'http://localhost:3002',
        commandes: process.env.COMMANDES_API_URL || 'http://localhost:3003'
      },
      monitoring: {
        grafana: 'http://localhost:3010',
        prometheus: 'http://localhost:9090',
        rabbitmq: 'http://localhost:15673'
      },
      routes: {
        clients: '/api/customers',
        produits: '/api/products', 
        commandes: '/api/orders',
        auth: '/api/auth',
        health: '/api/health'
      }
    };
  }
}
