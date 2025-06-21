import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQService } from './rabbitmq.service';
import { CustomerEventPublisher } from './publishers/customer-event.publisher';
import { OrderEventSubscriber } from './subscribers/order-event.subscriber';
import { Customer } from '../entities/customer.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Customer]),
  ],
  providers: [
    RabbitMQService,
    CustomerEventPublisher,
    OrderEventSubscriber,
  ],
  exports: [
    RabbitMQService,
    CustomerEventPublisher,
    OrderEventSubscriber,
  ],
})
export class RabbitMQModule {} 