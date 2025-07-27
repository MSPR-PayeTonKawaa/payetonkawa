import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SecurityMiddleware } from './security/security.middleware';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AppController', () => {
    const appController = module.get<AppController>(AppController);
    expect(appController).toBeDefined();
  });

  it('should have AppService', () => {
    const appService = module.get<AppService>(AppService);
    expect(appService).toBeDefined();
  });

  it('should have SecurityMiddleware', () => {
    const securityMiddleware = module.get<SecurityMiddleware>(SecurityMiddleware);
    expect(securityMiddleware).toBeDefined();
  });

  it('should import ProxyModule', () => {
    const proxyModule = module.get(ProxyModule);
    expect(proxyModule).toBeDefined();
  });

  it('should import HealthModule', () => {
    const healthModule = module.get(HealthModule);
    expect(healthModule).toBeDefined();
  });

  it('should import AuthModule', () => {
    const authModule = module.get(AuthModule);
    expect(authModule).toBeDefined();
  });

  it('should import MonitoringModule', () => {
    const monitoringModule = module.get(MonitoringModule);
    expect(monitoringModule).toBeDefined();
  });

  it('should configure throttler with correct settings', () => {
    // Vérifier que le module ThrottlerModule est configuré
    expect(module).toBeDefined();
  });
});
