import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('ProductsAPI');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Configuration CORS
  app.enableCors({
    origin: [
      'http://localhost:3000', // API Gateway
      'http://localhost:3001', // Clients API
      'http://localhost:3003', // Commandes API
      'http://localhost:5173', // Frontend Vite
      'http://localhost:8080', // Frontend alternative
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('PayeTonKawa - API Produits')
    .setDescription(`
      API de gestion des produits pour PayeTonKawa.
      
      Cette API permet de :
      - 📦 **Gérer le catalogue** : Créer, modifier, supprimer des produits
      - 📊 **Gérer les stocks** : Suivi en temps réel des quantités
      - 🔍 **Rechercher** : Filtres avancés et recherche textuelle
      - 📈 **Analyser** : Alertes de stock et statistiques
      - 🏷️ **Catégoriser** : Organisation par catégories
      
      **Architecture** : Microservice autonome avec base PostgreSQL
      **Intégration** : Via API Gateway sur http://localhost:3000/api/products
    `)
    .setVersion('1.0.0')
    .addTag('📦 Produits', 'Gestion complète du catalogue produits')
    .addTag('📊 Monitoring', 'Health checks et informations système')
    .addServer('http://localhost:3002', 'API Produits directe')
    .addServer('http://localhost:3000/api', 'Via API Gateway')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'PayeTonKawa - API Produits',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #8B4513; }
    `,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Service Produits démarré sur http://localhost:${port}`);
  logger.log(`📚 Documentation Swagger : http://localhost:${port}/api-docs`);
  logger.log(`🔌 API Gateway : http://localhost:3000/api/products`);
  logger.log(`🗄️ Base de données : PostgreSQL:5434/products_db`);
  
  // Informations de debug en développement
  if (process.env.NODE_ENV === 'development') {
    logger.debug('🔧 Variables d\'environnement:');
    logger.debug(`   - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    logger.debug(`   - DB_PORT: ${process.env.DB_PORT || '5434'}`);
    logger.debug(`   - DB_NAME: ${process.env.DB_NAME || 'products_db'}`);
    logger.debug(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  }
}

bootstrap().catch((error) => {
  Logger.error('❌ Erreur lors du démarrage du service:', error);
  process.exit(1);
});
