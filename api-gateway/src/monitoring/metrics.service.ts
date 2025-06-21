import { Injectable, Logger } from '@nestjs/common';

interface HttpMetric {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  service?: string;
}

interface ApiStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByStatusCode: Record<number, number>;
  requestsByEndpoint: Record<string, number>;
  requestsByService: Record<string, number>;
  slowestRequests: HttpMetric[];
  errorRequests: HttpMetric[];
}

interface RabbitMQMetric {
  timestamp: string;
  queue: string;
  messagesSent: number;
  messagesReceived: number;
  messagesInQueue: number;
  consumers: number;
}

/**
 * Service de métriques conforme MSPR814
 * 
 * Collecte et analyse les métriques requises :
 * - Nombre d'appels HTTP par API
 * - Codes HTTP de retour 
 * - Temps moyens d'exécution des appels HTTP
 * - Nombre de messages échangés sur le message broker par file d'attente
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  
  // Stockage en mémoire des métriques (en production, utiliser Redis/InfluxDB)
  private httpMetrics: HttpMetric[] = [];
  private rabbitMQMetrics: RabbitMQMetric[] = [];
  
  // Configuration
  private readonly maxMetricsInMemory = 10000;
  private readonly slowRequestThreshold = 2000; // 2 secondes
  
  /**
   * Enregistrer une métrique HTTP (appelé par le middleware)
   */
  recordHttpMetric(metric: HttpMetric): void {
    // Ajouter la métrique
    this.httpMetrics.push({
      ...metric,
      timestamp: new Date().toISOString(),
    });
    
    // Nettoyer les anciennes métriques pour éviter la surcharge mémoire
    if (this.httpMetrics.length > this.maxMetricsInMemory) {
      this.httpMetrics = this.httpMetrics.slice(-this.maxMetricsInMemory);
    }
    
    // Log des requêtes lentes ou en erreur
    if (metric.responseTime > this.slowRequestThreshold) {
      this.logger.warn(`Requête lente détectée: ${metric.responseTime}ms - ${metric.method} ${metric.url}`);
    }
    
    if (metric.statusCode >= 400) {
      this.logger.warn(`Erreur HTTP: ${metric.statusCode} - ${metric.method} ${metric.url}`);
    }
  }
  
  /**
   * Enregistrer une métrique RabbitMQ
   */
  recordRabbitMQMetric(metric: RabbitMQMetric): void {
    this.rabbitMQMetrics.push({
      ...metric,
      timestamp: new Date().toISOString(),
    });
    
    // Nettoyer les anciennes métriques
    if (this.rabbitMQMetrics.length > this.maxMetricsInMemory) {
      this.rabbitMQMetrics = this.rabbitMQMetrics.slice(-this.maxMetricsInMemory);
    }
  }
  
  /**
   * Obtenir les statistiques HTTP globales (MSPR814)
   */
  getHttpStats(timeRange?: string): ApiStats {
    const metrics = this.getMetricsInTimeRange(this.httpMetrics, timeRange);
    
    if (metrics.length === 0) {
      return this.getEmptyApiStats();
    }
    
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.statusCode >= 200 && m.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const totalResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = Math.round(totalResponseTime / totalRequests);
    
    // Répartition par code de statut
    const requestsByStatusCode: Record<number, number> = {};
    metrics.forEach(m => {
      requestsByStatusCode[m.statusCode] = (requestsByStatusCode[m.statusCode] || 0) + 1;
    });
    
    // Répartition par endpoint
    const requestsByEndpoint: Record<string, number> = {};
    metrics.forEach(m => {
      const endpoint = this.normalizeEndpoint(m.url);
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1;
    });
    
    // Répartition par service
    const requestsByService: Record<string, number> = {};
    metrics.forEach(m => {
      const service = this.extractServiceFromUrl(m.url);
      requestsByService[service] = (requestsByService[service] || 0) + 1;
    });
    
    // Requêtes les plus lentes
    const slowestRequests = metrics
      .filter(m => m.responseTime > this.slowRequestThreshold)
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);
    
    // Requêtes en erreur
    const errorRequests = metrics
      .filter(m => m.statusCode >= 400)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      requestsByStatusCode,
      requestsByEndpoint,
      requestsByService,
      slowestRequests,
      errorRequests,
    };
  }
  
  /**
   * Obtenir les statistiques RabbitMQ (MSPR814)
   */
  getRabbitMQStats(timeRange?: string): Record<string, any> {
    const metrics = this.getMetricsInTimeRange(this.rabbitMQMetrics, timeRange);
    
    if (metrics.length === 0) {
      return {
        totalMessages: 0,
        messagesByQueue: {},
        queueStats: {},
        lastUpdate: new Date().toISOString(),
      };
    }
    
    // Agrégation par queue
    const messagesByQueue: Record<string, any> = {};
    const queueStats: Record<string, any> = {};
    
    metrics.forEach(metric => {
      if (!messagesByQueue[metric.queue]) {
        messagesByQueue[metric.queue] = {
          sent: 0,
          received: 0,
          inQueue: metric.messagesInQueue,
          consumers: metric.consumers,
        };
      }
      
      messagesByQueue[metric.queue].sent += metric.messagesSent;
      messagesByQueue[metric.queue].received += metric.messagesReceived;
      messagesByQueue[metric.queue].inQueue = metric.messagesInQueue; // Dernière valeur
      messagesByQueue[metric.queue].consumers = metric.consumers; // Dernière valeur
    });
    
    // Calcul des statistiques globales
    const totalMessages = Object.values(messagesByQueue).reduce(
      (sum: number, queue: any) => sum + queue.sent + queue.received, 0
    );
    
    return {
      totalMessages,
      messagesByQueue,
      queueStats: messagesByQueue,
      lastUpdate: metrics[metrics.length - 1]?.timestamp || new Date().toISOString(),
    };
  }
  
  /**
   * Obtenir les métriques détaillées pour Grafana/Prometheus
   */
  getDetailedMetrics(): any {
    const httpStats = this.getHttpStats();
    const rabbitMQStats = this.getRabbitMQStats();
    
    return {
      timestamp: new Date().toISOString(),
      http: {
        ...httpStats,
        requestsPerMinute: this.calculateRequestsPerMinute(),
        topEndpoints: this.getTopEndpoints(10),
        errorRate: httpStats.totalRequests > 0 ? 
          Math.round((httpStats.failedRequests / httpStats.totalRequests) * 100) : 0,
      },
      rabbitmq: rabbitMQStats,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      performance: {
        slowRequests: httpStats.slowestRequests.length,
        errorRequests: httpStats.errorRequests.length,
        averageResponseTime: httpStats.averageResponseTime,
        p95ResponseTime: this.calculatePercentile(95),
        p99ResponseTime: this.calculatePercentile(99),
      }
    };
  }
  
  /**
   * Obtenir un résumé des métriques pour le dashboard admin
   */
  getDashboardSummary(): any {
    const httpStats = this.getHttpStats('1h'); // Dernière heure
    const rabbitMQStats = this.getRabbitMQStats('1h');
    
    return {
      period: 'Dernière heure',
      timestamp: new Date().toISOString(),
      http: {
        totalRequests: httpStats.totalRequests,
        successRate: httpStats.totalRequests > 0 ? 
          Math.round((httpStats.successfulRequests / httpStats.totalRequests) * 100) : 100,
        averageResponseTime: httpStats.averageResponseTime,
        slowRequests: httpStats.slowestRequests.length,
        errorRequests: httpStats.errorRequests.length,
      },
      rabbitmq: {
        totalMessages: rabbitMQStats.totalMessages,
        activeQueues: Object.keys(rabbitMQStats.messagesByQueue || {}).length,
        messagesInQueues: Object.values(rabbitMQStats.messagesByQueue || {})
          .reduce((sum: number, queue: any) => sum + (queue.inQueue || 0), 0),
      },
      alerts: this.generateAlerts(httpStats),
    };
  }
  
  // Méthodes utilitaires privées
  
  private getMetricsInTimeRange<T extends { timestamp: string }>(
    metrics: T[], 
    timeRange?: string
  ): T[] {
    if (!timeRange) return metrics;
    
    const now = new Date();
    let cutoffTime: Date;
    
    switch (timeRange) {
      case '5m':
        cutoffTime = new Date(now.getTime() - 5 * 60 * 1000);
        break;
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      default:
        return metrics;
    }
    
    return metrics.filter(m => new Date(m.timestamp) >= cutoffTime);
  }
  
  private normalizeEndpoint(url: string): string {
    // Normaliser les URLs avec des IDs
    return url
      .replace(/\/[0-9a-fA-F-]{36}/g, '/{id}') // UUIDs
      .replace(/\/\d+/g, '/{id}') // Numeric IDs
      .replace(/\?.*$/, ''); // Remove query params
  }
  
  private extractServiceFromUrl(url: string): string {
    if (url.includes('/api/customers')) return 'clients';
    if (url.includes('/api/products')) return 'produits';
    if (url.includes('/api/orders')) return 'commandes';
    if (url.includes('/api/auth')) return 'auth';
    if (url.includes('/api/health')) return 'monitoring';
    return 'gateway';
  }
  
  private calculateRequestsPerMinute(): number {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentRequests = this.httpMetrics.filter(
      m => new Date(m.timestamp) >= oneMinuteAgo
    );
    return recentRequests.length;
  }
  
  private getTopEndpoints(limit: number): Array<{ endpoint: string; count: number }> {
    const endpointCounts: Record<string, number> = {};
    
    this.httpMetrics.forEach(m => {
      const endpoint = this.normalizeEndpoint(m.url);
      endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
    });
    
    return Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  private calculatePercentile(percentile: number): number {
    const responseTimes = this.httpMetrics
      .map(m => m.responseTime)
      .sort((a, b) => a - b);
    
    if (responseTimes.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * responseTimes.length) - 1;
    return responseTimes[index] || 0;
  }
  
  private generateAlerts(httpStats: ApiStats): Array<{ type: string; message: string; severity: string }> {
    const alerts: Array<{ type: string; message: string; severity: string }> = [];
    
    // Alerte taux d'erreur élevé
    const errorRate = httpStats.totalRequests > 0 ? 
      (httpStats.failedRequests / httpStats.totalRequests) * 100 : 0;
    
    if (errorRate > 10) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        message: `Taux d'erreur élevé: ${Math.round(errorRate)}%`,
        severity: 'critical'
      });
    }
    
    // Alerte temps de réponse élevé
    if (httpStats.averageResponseTime > 3000) {
      alerts.push({
        type: 'SLOW_RESPONSE_TIME',
        message: `Temps de réponse moyen élevé: ${httpStats.averageResponseTime}ms`,
        severity: 'warning'
      });
    }
    
    // Alerte requêtes lentes
    if (httpStats.slowestRequests.length > 5) {
      alerts.push({
        type: 'MULTIPLE_SLOW_REQUESTS',
        message: `${httpStats.slowestRequests.length} requêtes lentes détectées`,
        severity: 'warning'
      });
    }
    
    return alerts;
  }
  
  private getEmptyApiStats(): ApiStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsByStatusCode: {},
      requestsByEndpoint: {},
      requestsByService: {},
      slowestRequests: [],
      errorRequests: [],
    };
  }
} 