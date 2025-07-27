import { Test, TestingModule } from '@nestjs/testing';
import { HealthModule } from './health.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have HealthController', () => {
    const controller = module.get<HealthController>(HealthController);
    expect(controller).toBeDefined();
  });

  it('should have HealthService', () => {
    const service = module.get<HealthService>(HealthService);
    expect(service).toBeDefined();
  });
});
