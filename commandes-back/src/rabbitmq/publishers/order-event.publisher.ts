import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';

export interface OrderCreatedEvent {
  eventType: 'order.created';
  orderId: string;
  customerId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  timestamp: string;
}

export interface OrderStatusChangedEvent {
  eventType: 'order.status.changed';
  orderId: string;
  customerId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

export interface OrderCancelledEvent {
  eventType: 'order.cancelled';
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  timestamp: string;
}

@Injectable()
export class OrderEventPublisher {
  private readonly logger = new Logger(OrderEventPublisher.name);
  private readonly EXCHANGE = 'payetonkawa.events';

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async publishOrderCreated(order: Order): Promise<void> {
    try {
      const event: OrderCreatedEvent = {
        eventType: 'order.created',
        orderId: order.id,
        customerId: order.customerId,
        totalAmount: order.totalAmount,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        timestamp: new Date().toISOString(),
      };

      // Publier vers la queue product.events pour décrément stock
      await this.rabbitMQService.publish(
        '',  // Exchange par défaut (direct)
        'product.events',  // Queue directe
        event
      );

      this.logger.log(`✅ Événement order.created publié vers product.events pour commande ${order.id}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication order.created pour ${order.id}:`, error);
      throw error;
    }
  }

  async publishOrderStatusChanged(order: Order, oldStatus: string): Promise<void> {
    try {
      const event: OrderStatusChangedEvent = {
        eventType: 'order.status.changed',
        orderId: order.id,
        customerId: order.customerId,
        oldStatus,
        newStatus: order.status,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        `order.${order.status}`,
        event
      );

      this.logger.log(`✅ Événement order.${order.status} publié pour commande ${order.id}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication order.status.changed pour ${order.id}:`, error);
      throw error;
    }
  }

  async publishOrderCancelled(order: Order): Promise<void> {
    try {
      const event: OrderCancelledEvent = {
        eventType: 'order.cancelled',
        orderId: order.id,
        customerId: order.customerId,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        timestamp: new Date().toISOString(),
      };

      // Publier vers la queue product.events pour incrément stock
      await this.rabbitMQService.publish(
        '',  // Exchange par défaut (direct)
        'product.events',  // Queue directe
        event
      );

      this.logger.log(`✅ Événement order.cancelled publié vers product.events pour commande ${order.id}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication order.cancelled pour ${order.id}:`, error);
      throw error;
    }
  }
} 