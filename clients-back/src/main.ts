import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('ClientsAPI');

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS pour développement
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
  });

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('PayeTonKawa - API Clients')
    .setDescription(`
      **API de gestion des clients** pour PayeTonKawa - Architecture microservices
      
      Cette API permet de :
      - 🧑‍💼 **Gérer les clients** (particuliers et entreprises)
      - 🏠 **Gérer les adresses** de livraison
      - 👤 **Gérer les profils** détaillés
      - 🏢 **Gérer les entreprises** clientes
      
      **Base de données** : PostgreSQL sur port 5433
      **API Gateway** : http://localhost:3000/api/customers
    `)
    .setVersion('1.0.0')
    .addTag('🧑‍💼 Clients', 'Gestion complète des clients')
    .addTag('📊 Monitoring', 'Health checks et métriques')
    .addServer('http://localhost:3001', 'Service Clients local')
    .addServer('http://localhost:3000/api', 'Via API Gateway')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestHeaders: true,
    },
    customSiteTitle: 'PayeTonKawa - API Clients',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 API Clients démarrée sur http://localhost:${port}`);
  logger.log(`📚 Documentation Swagger : http://localhost:${port}/api-docs`);
  logger.log(`📊 Via API Gateway : http://localhost:3000/api/customers`);
  logger.log(`🗄️  Base de données : PostgreSQL sur port 5433`);
}
bootstrap();
