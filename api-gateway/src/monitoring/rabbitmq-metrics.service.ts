import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface QueueInfo {
  name: string;
  messages: number;
  messages_ready: number;
  messages_unacknowledged: number;
  consumers: number;
  message_stats?: {
    publish: number;
    deliver_get: number;
    ack: number;
    redeliver: number;
  };
}

interface RabbitMQOverview {
  management_version: string;
  rabbitmq_version: string;
  message_stats?: {
    publish: number;
    deliver_get: number;
    ack: number;
  };
  queue_totals?: {
    messages: number;
    messages_ready: number;
    messages_unacknowledged: number;
  };
}

/**
 * Service de collecte des métriques RabbitMQ pour MSPR814
 * 
 * Collecte les statistiques requises :
 * - Nombre de messages échangés sur le message broker par file d'attente
 * - État des queues et consommateurs
 * - Performances du message broker
 */
@Injectable()
export class RabbitMQMetricsService {
  private readonly logger = new Logger(RabbitMQMetricsService.name);
  
  private readonly managementUrl = 'http://localhost:15672/api';
  private readonly auth = {
    username: 'guest',
    password: 'guest'
  };

  /**
   * Obtenir les métriques de toutes les queues (MSPR814)
   */
  async getQueuesMetrics(): Promise<any> {
    try {
      const response = await axios.get(`${this.managementUrl}/queues`, {
        auth: this.auth,
        timeout: 5000
      });

      const queues: QueueInfo[] = response.data;
      
      const queueMetrics = queues.map(queue => ({
        queue: queue.name,
        messagesInQueue: queue.messages,
        messagesReady: queue.messages_ready,
        messagesUnacknowledged: queue.messages_unacknowledged,
        consumers: queue.consumers,
        messageStats: {
          published: queue.message_stats?.publish || 0,
          delivered: queue.message_stats?.deliver_get || 0,
          acknowledged: queue.message_stats?.ack || 0,
          redelivered: queue.message_stats?.redeliver || 0,
        },
        lastUpdate: new Date().toISOString()
      }));

      // Calcul des totaux
      const totalMessages = queueMetrics.reduce((sum, q) => sum + q.messagesInQueue, 0);
      const totalPublished = queueMetrics.reduce((sum, q) => sum + q.messageStats.published, 0);
      const totalDelivered = queueMetrics.reduce((sum, q) => sum + q.messageStats.delivered, 0);
      const totalConsumers = queueMetrics.reduce((sum, q) => sum + q.consumers, 0);

      return {
        timestamp: new Date().toISOString(),
        summary: {
          totalQueues: queueMetrics.length,
          totalMessages,
          totalPublished,
          totalDelivered,
          totalConsumers,
          averageMessagesPerQueue: queueMetrics.length > 0 ? Math.round(totalMessages / queueMetrics.length) : 0,
        },
        queues: queueMetrics,
        payeTonKawaQueues: queueMetrics.filter(q => 
          q.queue.includes('customer.events') || 
          q.queue.includes('product.events') || 
          q.queue.includes('order.events') || 
          q.queue.includes('stock.events')
        )
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la collecte des métriques des queues: ${error.message}`);
      return {
        error: 'Impossible de collecter les métriques des queues',
        timestamp: new Date().toISOString(),
        summary: {
          totalQueues: 0,
          totalMessages: 0,
          totalPublished: 0,
          totalDelivered: 0,
          totalConsumers: 0,
        },
        queues: [],
        payeTonKawaQueues: []
      };
    }
  }

  /**
   * Obtenir les métriques globales de RabbitMQ
   */
  async getOverviewMetrics(): Promise<any> {
    try {
      const response = await axios.get(`${this.managementUrl}/overview`, {
        auth: this.auth,
        timeout: 5000
      });

      const overview: RabbitMQOverview = response.data;

      return {
        timestamp: new Date().toISOString(),
        version: {
          rabbitmq: overview.rabbitmq_version,
          management: overview.management_version
        },
        messageStats: {
          totalPublished: overview.message_stats?.publish || 0,
          totalDelivered: overview.message_stats?.deliver_get || 0,
          totalAcknowledged: overview.message_stats?.ack || 0,
        },
        queueTotals: {
          totalMessages: overview.queue_totals?.messages || 0,
          messagesReady: overview.queue_totals?.messages_ready || 0,
          messagesUnacknowledged: overview.queue_totals?.messages_unacknowledged || 0,
        },
        status: 'healthy'
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la collecte des métriques globales: ${error.message}`);
      return {
        timestamp: new Date().toISOString(),
        error: 'Impossible de collecter les métriques globales',
        status: 'unhealthy'
      };
    }
  }

  /**
   * Obtenir les métriques spécifiques PayeTonKawa (MSPR814)
   */
  async getPayeTonKawaMetrics(): Promise<any> {
    try {
      const queuesMetrics = await this.getQueuesMetrics();
      const overviewMetrics = await this.getOverviewMetrics();

      // Filtrer les queues PayeTonKawa
      const payeTonKawaQueues = queuesMetrics.payeTonKawaQueues || [];

      // Calcul des métriques métier
      const businessMetrics = {
        customerEvents: this.findQueueMetrics(payeTonKawaQueues, 'customer.events'),
        productEvents: this.findQueueMetrics(payeTonKawaQueues, 'product.events'),
        orderEvents: this.findQueueMetrics(payeTonKawaQueues, 'order.events'),
        stockEvents: this.findQueueMetrics(payeTonKawaQueues, 'stock.events'),
      };

      // Calcul des totaux métier
      const totalBusinessMessages = Object.values(businessMetrics).reduce(
        (sum, queue: any) => sum + (queue?.messagesInQueue || 0), 0
      );

      const totalBusinessPublished = Object.values(businessMetrics).reduce(
        (sum, queue: any) => sum + (queue?.messageStats?.published || 0), 0
      );

      return {
        timestamp: new Date().toISOString(),
        period: 'Temps réel',
        overview: overviewMetrics,
        business: {
          totalBusinessMessages,
          totalBusinessPublished,
          services: businessMetrics,
          alerts: this.generateRabbitMQAlerts(businessMetrics),
        },
        performance: {
          throughput: this.calculateThroughput(payeTonKawaQueues),
          latency: 'N/A', // Nécessiterait des métriques plus avancées
          errorRate: this.calculateErrorRate(payeTonKawaQueues),
        }
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la collecte des métriques PayeTonKawa: ${error.message}`);
      return {
        timestamp: new Date().toISOString(),
        error: 'Impossible de collecter les métriques PayeTonKawa',
        business: {
          totalBusinessMessages: 0,
          totalBusinessPublished: 0,
          services: {},
          alerts: []
        }
      };
    }
  }

  /**
   * Obtenir les métriques pour un dashboard temps réel
   */
  async getDashboardMetrics(): Promise<any> {
    const [queuesMetrics, overviewMetrics, payeTonKawaMetrics] = await Promise.all([
      this.getQueuesMetrics(),
      this.getOverviewMetrics(),
      this.getPayeTonKawaMetrics()
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: overviewMetrics.status,
      summary: {
        totalQueues: queuesMetrics.summary?.totalQueues || 0,
        totalMessages: queuesMetrics.summary?.totalMessages || 0,
        totalConsumers: queuesMetrics.summary?.totalConsumers || 0,
        businessMessages: payeTonKawaMetrics.business?.totalBusinessMessages || 0,
      },
      health: {
        rabbitmq: overviewMetrics.status === 'healthy',
        queuesActive: (queuesMetrics.summary?.totalQueues || 0) > 0,
        consumersActive: (queuesMetrics.summary?.totalConsumers || 0) > 0,
      },
      alerts: payeTonKawaMetrics.business?.alerts || []
    };
  }

  // Méthodes utilitaires privées

  private findQueueMetrics(queues: any[], queueNamePattern: string): any {
    return queues.find(q => q.queue.includes(queueNamePattern)) || {
      queue: queueNamePattern,
      messagesInQueue: 0,
      consumers: 0,
      messageStats: { published: 0, delivered: 0, acknowledged: 0, redelivered: 0 }
    };
  }

  private calculateThroughput(queues: any[]): number {
    // Calcul simple du throughput basé sur les messages délivrés
    const totalDelivered = queues.reduce((sum, q) => sum + (q.messageStats?.delivered || 0), 0);
    return totalDelivered; // Messages par période
  }

  private calculateErrorRate(queues: any[]): number {
    const totalDelivered = queues.reduce((sum, q) => sum + (q.messageStats?.delivered || 0), 0);
    const totalRedelivered = queues.reduce((sum, q) => sum + (q.messageStats?.redelivered || 0), 0);
    
    if (totalDelivered === 0) return 0;
    return Math.round((totalRedelivered / totalDelivered) * 100);
  }

  private generateRabbitMQAlerts(businessMetrics: any): Array<{ type: string; message: string; severity: string }> {
    const alerts: Array<{ type: string; message: string; severity: string }> = [];

    // Alerte si des messages s'accumulent
    Object.entries(businessMetrics).forEach(([service, metrics]: [string, any]) => {
      if (metrics.messagesInQueue > 100) {
        alerts.push({
          type: 'QUEUE_BACKLOG',
          message: `File d'attente ${service} surchargée: ${metrics.messagesInQueue} messages`,
          severity: 'warning'
        });
      }

      if (metrics.consumers === 0 && metrics.messagesInQueue > 0) {
        alerts.push({
          type: 'NO_CONSUMERS',
          message: `Aucun consommateur pour ${service} avec ${metrics.messagesInQueue} messages`,
          severity: 'critical'
        });
      }
    });

    return alerts;
  }
} 