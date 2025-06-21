import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProxyModule } from './proxy/proxy.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SecurityMiddleware } from './security/security.middleware';

@Module({
  imports: [
    // Rate limiting configuration (renforcé pour la sécurité)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 60, // 60 requests per minute per IP (réduit pour plus de sécurité)
    }]),
    
    // Feature modules
    AuthModule,
    ProxyModule,
    HealthModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [AppService, SecurityMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Application du middleware de sécurité à toutes les routes
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
  }
}
