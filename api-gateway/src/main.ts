import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('API Gateway');

  // Security middlewares
  app.use(helmet());
  app.use(compression());
  
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://payetonkawa.fr'] 
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  }));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger centralisé pour toutes les APIs
  const config = new DocumentBuilder()
    .setTitle('PayeTonKawa API Gateway')
    .setDescription(`
      API Gateway centralisée pour l'architecture microservices PayeTonKawa.
      
      Cette documentation combine toutes les APIs :
      - 🧑‍💼 **Clients API** : Gestion des clients, profils et entreprises
      - 📦 **Produits API** : Catalogue produits et gestion des stocks
      - 🛒 **Commandes API** : Gestion des commandes et validation métier
      
      **Architecture** : Microservices avec communication via RabbitMQ
      **Authentification** : JWT Token Bearer
      **Monitoring** : Grafana disponible sur http://localhost:3010
    `)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Token JWT pour authentification',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('🔐 Authentication', 'Endpoints d\'authentification')
    .addTag('🧑‍💼 Clients', 'Gestion des clients et entreprises')
    .addTag('📦 Produits', 'Catalogue produits et stocks')
    .addTag('🛒 Commandes', 'Gestion des commandes')
    .addTag('📊 Monitoring', 'Health checks et métriques')
    .addServer('http://localhost:3000', 'Environnement de développement')
    .addServer('https://api.payetonkawa.fr', 'Environnement de production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestHeaders: true,
    },
    customSiteTitle: 'PayeTonKawa API Documentation',
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
  });

  // Note: Pas de préfixe global, chaque controller gère son préfixe

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 API Gateway démarré sur http://localhost:${port}`);
  logger.log(`📚 Documentation Swagger : http://localhost:${port}/api-docs`);
  logger.log(`🐰 RabbitMQ Management : http://localhost:15673`);
  logger.log(`📊 Grafana : http://localhost:3010 (admin/admin)`);
  logger.log(`📈 Prometheus : http://localhost:9090`);
}
bootstrap();
