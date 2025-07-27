import { Test, TestingModule } from '@nestjs/testing';
import { ProxyModule } from './proxy.module';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';

describe('ProxyModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ProxyModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have ProxyController', () => {
    const controller = module.get<ProxyController>(ProxyController);
    expect(controller).toBeDefined();
  });

  it('should have ProxyService', () => {
    const service = module.get<ProxyService>(ProxyService);
    expect(service).toBeDefined();
  });
});
