import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringModule } from './monitoring.module';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';
import { RabbitMQMetricsService } from './rabbitmq-metrics.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('MonitoringModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
        MonitoringModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have MonitoringController', () => {
    const controller = module.get<MonitoringController>(MonitoringController);
    expect(controller).toBeDefined();
  });

  it('should have MetricsService', () => {
    const service = module.get<MetricsService>(MetricsService);
    expect(service).toBeDefined();
  });

  it('should have RabbitMQMetricsService', () => {
    const service = module.get<RabbitMQMetricsService>(RabbitMQMetricsService);
    expect(service).toBeDefined();
  });

  it('should export MetricsService', () => {
    const service = module.get<MetricsService>(MetricsService);
    expect(service).toBeDefined();
  });

  it('should export RabbitMQMetricsService', () => {
    const service = module.get<RabbitMQMetricsService>(RabbitMQMetricsService);
    expect(service).toBeDefined();
  });
});
