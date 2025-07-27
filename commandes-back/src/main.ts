import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('OrdersAPI');
  const app = await NestFactory.create(AppModule);

  // Configuration CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validation globale
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('PayeTonKawa - API Commandes')
    .setDescription(`
      <h3>🛒 Microservice de gestion des commandes</h3>
      <p>API REST complète pour la gestion du cycle de vie des commandes dans l'écosystème PayeTonKawa.</p>
      
      <h4>🎯 Fonctionnalités principales :</h4>
      <ul>
        <li><strong>Gestion des commandes</strong> : Création, modification, suivi</li>
        <li><strong>Workflow métier</strong> : Transitions de statut validées</li>
        <li><strong>Calcul automatique</strong> : Totaux et quantités</li>
        <li><strong>Statistiques</strong> : Reporting et analytics</li>
        <li><strong>Intégration</strong> : Communication avec services Clients et Produits</li>
      </ul>

      <h4>🔗 Architecture microservices :</h4>
      <ul>
        <li><strong>Service Clients</strong> : http://localhost:3001</li>
        <li><strong>Service Produits</strong> : http://localhost:3002</li>
        <li><strong>Service Commandes</strong> : http://localhost:3003 (ce service)</li>
        <li><strong>API Gateway</strong> : http://localhost:3000</li>
      </ul>
    `)
    .setVersion('1.0.0')
    .addTag('🏠 Service Info', 'Informations générales du service')
    .addTag('🛒 Commandes', 'Gestion complète des commandes')
    .setContact(
      'Équipe PayeTonKawa',
      'https://payetonkawa.fr',
      'dev@payetonkawa.fr'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'PayeTonKawa Orders API',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #8B4513; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Logs de démarrage
  logger.log(`🚀 Service Commandes démarré sur http://localhost:${port}`);
  logger.log(`📚 Documentation Swagger : http://localhost:${port}/api-docs`);
  logger.log(`🔌 API Gateway : http://localhost:3000/api/orders`);
  logger.log(`🗄️ Base de données : PostgreSQL:${process.env.DB_PORT || 5435}/${process.env.DB_NAME || 'commandes_db'}`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`🔧 Variables d'environnement:`);
    logger.debug(`   - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    logger.debug(`   - DB_PORT: ${process.env.DB_PORT || 5435}`);
    logger.debug(`   - DB_NAME: ${process.env.DB_NAME || 'commandes_db'}`);
    logger.debug(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  }
}

// Exporter bootstrap pour les tests
export default bootstrap;

bootstrap();
