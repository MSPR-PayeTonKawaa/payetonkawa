import { 
  Controller, 
  All, 
  Req, 
  Res, 
  HttpStatus,
  Logger,
  UseGuards
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiExcludeEndpoint 
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ProxyService } from './proxy.service';

@ApiTags('🔀 Proxy Routes')
@Controller('api')
@UseGuards(ThrottlerGuard)
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  // ========== ROUTES CLIENTS ==========
  @All('customers')
  @All('customers/*')
  @ApiOperation({
    summary: 'Routes Clients API',
    description: `
      Proxy vers le microservice Clients sur ${process.env.CLIENTS_API_URL || 'http://localhost:3001'}
      
      **Endpoints disponibles:**
      - GET /api/customers - Liste des clients
      - POST /api/customers - Créer un client
      - GET /api/customers/:id - Détails d'un client
      - PUT /api/customers/:id - Modifier un client
      - DELETE /api/customers/:id - Supprimer un client
      - GET /api/customers/:id/orders - Commandes d'un client
    `
  })
  @ApiResponse({ status: 200, description: 'Succès - dépend du endpoint spécifique' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  @ApiResponse({ status: 503, description: 'Service Clients indisponible' })
  async proxyToClients(@Req() req: Request, @Res() res: Response) {
    const targetUrl = process.env.CLIENTS_API_URL || 'http://localhost:3001';
    return this.proxyService.forwardRequest(req, res, targetUrl, 'customers');
  }

  // ========== ROUTES PRODUITS ==========
  @All('products')
  @All('products/*')
  @ApiOperation({
    summary: 'Routes Produits API',
    description: `
      Proxy vers le microservice Produits sur ${process.env.PRODUITS_API_URL || 'http://localhost:3002'}
      
      **Endpoints disponibles:**
      - GET /api/products - Catalogue des produits
      - POST /api/products - Créer un produit
      - GET /api/products/:id - Détails d'un produit
      - PUT /api/products/:id - Modifier un produit
      - DELETE /api/products/:id - Supprimer un produit
      - GET /api/products/categories - Catégories de produits
      - GET /api/products/search?q=terme - Recherche de produits
    `
  })
  @ApiResponse({ status: 200, description: 'Succès - dépend du endpoint spécifique' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  @ApiResponse({ status: 503, description: 'Service Produits indisponible' })
  async proxyToProducts(@Req() req: Request, @Res() res: Response) {
    const targetUrl = process.env.PRODUITS_API_URL || 'http://localhost:3002';
    return this.proxyService.forwardRequest(req, res, targetUrl, 'products');
  }

  // ========== ROUTES COMMANDES ==========
  @All('orders')
  @All('orders/*')
  @ApiOperation({
    summary: 'Routes Commandes API',
    description: `
      Proxy vers le microservice Commandes sur ${process.env.COMMANDES_API_URL || 'http://localhost:3003'}
      
      **Endpoints disponibles:**
      - GET /api/orders - Liste des commandes
      - POST /api/orders - Créer une commande
      - GET /api/orders/:id - Détails d'une commande
      - PUT /api/orders/:id - Modifier une commande
      - DELETE /api/orders/:id - Annuler une commande
      - POST /api/orders/:id/validate - Valider une commande
      - GET /api/orders/stats - Statistiques des commandes
    `
  })
  @ApiResponse({ status: 200, description: 'Succès - dépend du endpoint spécifique' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  @ApiResponse({ status: 503, description: 'Service Commandes indisponible' })
  async proxyToOrders(@Req() req: Request, @Res() res: Response) {
    const targetUrl = process.env.COMMANDES_API_URL || 'http://localhost:3003';
    return this.proxyService.forwardRequest(req, res, targetUrl, 'orders');
  }

  // ========== CATCH-ALL POUR AUTRES ROUTES ==========
  // Cette route doit être EN DERNIER pour ne pas capturer les autres routes
  @All('api-not-found/*')
  @All('unknown/*')
  @ApiExcludeEndpoint()
  async catchAll(@Req() req: Request, @Res() res: Response) {
    this.logger.warn(`Route non trouvée: ${req.method} ${req.url}`);
    
    res.status(HttpStatus.NOT_FOUND).json({
      statusCode: 404,
      message: 'Route non trouvée',
      error: 'Not Found',
      path: req.url,
      timestamp: new Date().toISOString(),
      suggestion: 'Consultez la documentation API : /api-docs',
      availableRoutes: [
        '/api/customers - Service Clients',
        '/api/products - Service Produits',
        '/api/orders - Service Commandes',
        '/api/auth - Authentification',
        '/api/health - Health checks'
      ]
    });
  }
} 