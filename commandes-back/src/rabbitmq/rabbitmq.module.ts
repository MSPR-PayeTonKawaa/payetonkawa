import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { OrderEventPublisher } from './publishers/order-event.publisher';
import { ProductEventSubscriber } from './subscribers/product-event.subscriber';
import { CustomerEventSubscriber } from './subscribers/customer-event.subscriber';

@Module({
  imports: [ConfigModule],
  providers: [
    RabbitMQService,
    OrderEventPublisher,
    ProductEventSubscriber,
    CustomerEventSubscriber,
  ],
  exports: [
    RabbitMQService,
    OrderEventPublisher,
    ProductEventSubscriber,
    CustomerEventSubscriber,
  ],
})
export class RabbitMQModule {} 