import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { RabbitMQMetricsService } from './rabbitmq-metrics.service';
import { MonitoringController } from './monitoring.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Import AuthModule pour accès au JwtService
  providers: [MetricsService, RabbitMQMetricsService],
  controllers: [MonitoringController],
  exports: [MetricsService, RabbitMQMetricsService], // Exporté pour être utilisé dans le middleware
})
export class MonitoringModule {} 