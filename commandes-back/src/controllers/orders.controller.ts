import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  ParseFloatPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { OrdersService, FindOrdersOptions } from '../services/orders.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  OrderResponseDto,
  OrderListResponseDto,
  OrderStatsResponseDto,
} from '../dto';
import { OrderStatus } from '../entities';

@ApiTags('🛒 Commandes')
@Controller('orders')
@UseInterceptors(ClassSerializerInterceptor)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une nouvelle commande',
    description: 'Crée une nouvelle commande avec validation métier et calcul automatique du total'
  })
  @ApiBody({
    type: CreateOrderDto,
    examples: {
      cafeOrder: {
        summary: 'Commande de café',
        description: 'Exemple de commande avec plusieurs articles',
        value: {
          customerId: '550e8400-e29b-41d4-a716-446655440001',
          items: [
            {
              productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
              quantity: 2,
              unitPrice: 24.99
            },
            {
              productId: '550e8400-e29b-41d4-a716-446655440103',
              quantity: 1,
              unitPrice: 599.00
            }
          ]
        }
      },
      simpleOrder: {
        summary: 'Commande simple',
        description: 'Commande avec un seul article',
        value: {
          customerId: '550e8400-e29b-41d4-a716-446655440002',
          items: [
            {
              productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
              quantity: 1,
              unitPrice: 24.99
            }
          ]
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Commande créée avec succès',
    type: OrderResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Données de commande invalides'
  })
  @ApiResponse({
    status: 404,
    description: 'Client ou produit non trouvé'
  })
  async create(@Body() createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer la liste des commandes',
    description: 'Récupère toutes les commandes avec pagination et filtres avancés'
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Numéro de page (défaut: 1)',
    required: false,
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'Nombre d\'éléments par page (défaut: 10, max: 100)',
    required: false,
    example: 10
  })
  @ApiQuery({
    name: 'customerId',
    type: String,
    description: 'Filtrer par client',
    required: false
  })
  @ApiQuery({
    name: 'status',
    enum: OrderStatus,
    description: 'Filtrer par statut',
    required: false
  })
  @ApiQuery({
    name: 'dateFrom',
    type: String,
    description: 'Date de début (ISO 8601)',
    required: false,
    example: '2024-01-01'
  })
  @ApiQuery({
    name: 'dateTo',
    type: String,
    description: 'Date de fin (ISO 8601)',
    required: false,
    example: '2024-12-31'
  })
  @ApiQuery({
    name: 'minAmount',
    type: Number,
    description: 'Montant minimum',
    required: false,
    example: 10
  })
  @ApiQuery({
    name: 'maxAmount',
    type: Number,
    description: 'Montant maximum',
    required: false,
    example: 1000
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des commandes récupérée',
    type: OrderListResponseDto
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('customerId') customerId?: string,
    @Query('status') status?: OrderStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
  ): Promise<OrderListResponseDto> {
    const options: FindOrdersOptions = {
      page: page && page > 0 ? page : 1,
      limit: limit && limit > 0 && limit <= 100 ? limit : 10,
      customerId,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      minAmount,
      maxAmount,
    };

    return this.ordersService.findAll(options);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Récupérer les statistiques des commandes',
    description: 'Récupère les statistiques globales : total, par statut, chiffre d\'affaires, etc.'
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des commandes',
    type: OrderStatsResponseDto
  })
  async getStats(): Promise<OrderStatsResponseDto> {
    return this.ordersService.getStats();
  }

  @Get('customers/:customerId')
  @ApiOperation({
    summary: 'Récupérer les commandes d\'un client',
    description: 'Récupère toutes les commandes d\'un client spécifique'
  })
  @ApiParam({
    name: 'customerId',
    type: String,
    description: 'Identifiant UUID du client'
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Numéro de page',
    required: false
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'Limite par page',
    required: false
  })
  @ApiQuery({
    name: 'status',
    enum: OrderStatus,
    description: 'Filtrer par statut',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'Commandes du client récupérées',
    type: OrderListResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Client non trouvé'
  })
  async findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
  ): Promise<OrderListResponseDto> {
    const options: FindOrdersOptions = {
      page: page && page > 0 ? page : 1,
      limit: limit && limit > 0 && limit <= 100 ? limit : 10,
      status,
    };

    return this.ordersService.findByCustomer(customerId, options);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une commande par son ID',
    description: 'Récupère les détails complets d\'une commande spécifique'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID de la commande',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({
    status: 200,
    description: 'Commande trouvée',
    type: OrderResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Commande non trouvée'
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour une commande',
    description: 'Met à jour une commande (seulement si elle est en attente)'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID de la commande'
  })
  @ApiBody({
    type: UpdateOrderDto,
    examples: {
      updateItems: {
        summary: 'Modifier les articles',
        description: 'Mise à jour des articles de la commande',
        value: {
          items: [
            {
              productId: 'e2641a5d-c196-42ac-89b8-8415cec7266c',
              quantity: 3,
              unitPrice: 24.99
            }
          ]
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Commande mise à jour',
    type: OrderResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Commande ne peut plus être modifiée'
  })
  @ApiResponse({
    status: 404,
    description: 'Commande non trouvée'
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Mettre à jour le statut d\'une commande',
    description: 'Change le statut d\'une commande avec validation des transitions autorisées'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID de la commande'
  })
  @ApiBody({
    type: UpdateOrderStatusDto,
    examples: {
      confirm: {
        summary: 'Confirmer la commande',
        value: { status: 'confirmed' }
      },
      ship: {
        summary: 'Expédier la commande',
        value: { status: 'shipped' }
      },
      deliver: {
        summary: 'Livrer la commande',
        value: { status: 'delivered' }
      },
      cancel: {
        summary: 'Annuler la commande',
        value: { status: 'cancelled' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Statut mis à jour',
    type: OrderResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Transition de statut non autorisée'
  })
  @ApiResponse({
    status: 404,
    description: 'Commande non trouvée'
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer une commande',
    description: 'Supprime une commande (seulement si elle peut être annulée)'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID de la commande'
  })
  @ApiResponse({
    status: 204,
    description: 'Commande supprimée avec succès'
  })
  @ApiResponse({
    status: 400,
    description: 'Commande ne peut pas être supprimée'
  })
  @ApiResponse({
    status: 404,
    description: 'Commande non trouvée'
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ordersService.remove(id);
  }
} 