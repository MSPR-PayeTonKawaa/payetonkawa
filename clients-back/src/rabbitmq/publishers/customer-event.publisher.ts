import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';
import { Customer } from '../../entities/customer.entity';

export interface CustomerCreatedEvent {
  eventType: 'customer.created';
  customerId: string;
  name: string;
  email: string;
  type: 'individual' | 'business';
  timestamp: string;
}

export interface CustomerUpdatedEvent {
  eventType: 'customer.updated';
  customerId: string;
  name: string;
  email: string;
  type: 'individual' | 'business';
  changes: string[];
  timestamp: string;
}

export interface CustomerDeletedEvent {
  eventType: 'customer.deleted';
  customerId: string;
  name: string;
  email: string;
  timestamp: string;
}

@Injectable()
export class CustomerEventPublisher {
  private readonly logger = new Logger(CustomerEventPublisher.name);
  private readonly EXCHANGE = 'payetonkawa.events';

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async publishCustomerCreated(customer: Customer): Promise<void> {
    try {
      const event: CustomerCreatedEvent = {
        eventType: 'customer.created',
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        type: customer.company ? 'business' : 'individual',
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'customer.created',
        event
      );

      this.logger.log(`✅ Événement customer.created publié pour client ${customer.name}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication customer.created pour ${customer.id}:`, error);
      // Ne pas faire échouer l'opération métier
    }
  }

  async publishCustomerUpdated(customer: Customer, changes: string[]): Promise<void> {
    try {
      const event: CustomerUpdatedEvent = {
        eventType: 'customer.updated',
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        type: customer.company ? 'business' : 'individual',
        changes,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'customer.updated',
        event
      );

      this.logger.log(`✅ Événement customer.updated publié pour client ${customer.name}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication customer.updated pour ${customer.id}:`, error);
      // Ne pas faire échouer l'opération métier
    }
  }

  async publishCustomerDeleted(customerId: string, customerName: string, email: string): Promise<void> {
    try {
      const event: CustomerDeletedEvent = {
        eventType: 'customer.deleted',
        customerId,
        name: customerName,
        email,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publish(
        this.EXCHANGE,
        'customer.deleted',
        event
      );

      this.logger.log(`✅ Événement customer.deleted publié pour client ${customerName}`);
    } catch (error) {
      this.logger.error(`❌ Erreur publication customer.deleted pour ${customerId}:`, error);
      // Ne pas faire échouer l'opération métier
    }
  }
} 