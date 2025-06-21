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
  ParseFloatPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { ProductsService, FindProductsOptions } from '../services/products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  SetStockDto,
  ProductResponseDto,
  ProductListResponseDto,
  StockAlertResponseDto,
} from '../dto';
import { StockStatus } from '../entities';

@ApiTags('📦 Produits')
@Controller('products')
@UseInterceptors(ClassSerializerInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer un nouveau produit',
    description: 'Crée un nouveau produit avec ses détails dans le catalogue PayeTonKawa'
  })
  @ApiBody({
    type: CreateProductDto,
    examples: {
      cafeArabica: {
        summary: 'Café Arabica Premium',
        description: 'Exemple de création d\'un café haut de gamme',
        value: {
          name: 'Café Arabica Éthiopie Premium',
          stock: 150,
          isActive: true,
          details: {
            price: 24.99,
            description: 'Café Arabica premium issu de l\'agriculture biologique, cultivé en altitude en Éthiopie. Notes florales et fruitées avec une acidité équilibrée.',
            color: 'Brun doré',
            category: 'Café en grains',
            origin: 'Éthiopie, région Yirgacheffe',
            weight: '250g',
            intensity: 7
          }
        }
      },
      cafeRobusta: {
        summary: 'Café Robusta Intense',
        description: 'Exemple de création d\'un café corsé',
        value: {
          name: 'Café Robusta Vietnam Intense',
          stock: 200,
          details: {
            price: 18.99,
            description: 'Café Robusta au goût puissant et corsé, parfait pour les expressos. Cultivé au Vietnam dans les hauts plateaux.',
            color: 'Brun foncé',
            category: 'Café en grains',
            origin: 'Vietnam, Dak Lak',
            weight: '500g',
            intensity: 9
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Produit créé avec succès',
    type: ProductResponseDto
  })
  @ApiResponse({
    status: 409,
    description: 'Un produit avec ce nom existe déjà'
  })
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer la liste des produits',
    description: 'Récupère tous les produits avec pagination et filtres avancés'
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
    name: 'search',
    type: String,
    description: 'Recherche dans le nom, description, catégorie',
    required: false,
    example: 'arabica'
  })
  @ApiQuery({
    name: 'category',
    type: String,
    description: 'Filtrer par catégorie',
    required: false,
    example: 'Café en grains'
  })
  @ApiQuery({
    name: 'priceMin',
    type: Number,
    description: 'Prix minimum',
    required: false,
    example: 10
  })
  @ApiQuery({
    name: 'priceMax',
    type: Number,
    description: 'Prix maximum',
    required: false,
    example: 50
  })
  @ApiQuery({
    name: 'stockStatus',
    enum: StockStatus,
    description: 'Filtrer par statut de stock',
    required: false
  })
  @ApiQuery({
    name: 'isActive',
    type: Boolean,
    description: 'Filtrer par statut actif/inactif',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des produits récupérée',
    type: ProductListResponseDto
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('stockStatus') stockStatus?: StockStatus,
    @Query('isActive') isActive?: boolean,
  ): Promise<ProductListResponseDto> {
    const options: FindProductsOptions = {
      page: page && page > 0 ? page : 1,
      limit: limit && limit > 0 && limit <= 100 ? limit : 10,
      search,
      category,
      priceMin,
      priceMax,
      stockStatus,
      isActive,
    };

    return this.productsService.findAll(options);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Recherche rapide de produits',
    description: 'Recherche rapide dans le nom, description, catégorie et origine'
  })
  @ApiQuery({
    name: 'q',
    type: String,
    description: 'Terme de recherche',
    example: 'arabica éthiopie'
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche',
    type: [ProductResponseDto]
  })
  async search(@Query('q') query: string): Promise<ProductResponseDto[]> {
    return this.productsService.searchProducts(query);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Récupérer toutes les catégories',
    description: 'Récupère la liste de toutes les catégories de produits disponibles'
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des catégories',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['Café en grains', 'Café moulu', 'Café instantané', 'Thé', 'Accessoires']
    }
  })
  async getCategories(): Promise<string[]> {
    return this.productsService.getCategories();
  }

  @Get('alerts/stock')
  @ApiOperation({
    summary: 'Récupérer les alertes de stock',
    description: 'Récupère tous les produits en rupture ou avec stock faible'
  })
  @ApiResponse({
    status: 200,
    description: 'Alertes de stock',
    type: StockAlertResponseDto
  })
  async getStockAlerts(): Promise<StockAlertResponseDto> {
    return this.productsService.getStockAlerts();
  }

  @Get('price-range')
  @ApiOperation({
    summary: 'Récupérer les produits par gamme de prix',
    description: 'Récupère tous les produits dans une gamme de prix spécifique'
  })
  @ApiQuery({
    name: 'min',
    type: Number,
    description: 'Prix minimum',
    example: 10
  })
  @ApiQuery({
    name: 'max',
    type: Number,
    description: 'Prix maximum',
    example: 30
  })
  @ApiResponse({
    status: 200,
    description: 'Produits dans la gamme de prix',
    type: [ProductResponseDto]
  })
  async getByPriceRange(
    @Query('min', ParseFloatPipe) min: number,
    @Query('max', ParseFloatPipe) max: number,
  ): Promise<ProductResponseDto[]> {
    return this.productsService.getProductsByPriceRange(min, max);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un produit par ID',
    description: 'Récupère les détails complets d\'un produit spécifique'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du produit',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({
    status: 200,
    description: 'Détails du produit',
    type: ProductResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Produit non trouvé'
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un produit',
    description: 'Met à jour partiellement les informations d\'un produit'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du produit',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiBody({
    type: UpdateProductDto,
    examples: {
      updatePrice: {
        summary: 'Mise à jour du prix',
        value: {
          details: {
            price: 26.99
          }
        }
      },
      updateStock: {
        summary: 'Mise à jour du stock',
        value: {
          stock: 200
        }
      },
      updateInfo: {
        summary: 'Mise à jour des informations',
        value: {
          name: 'Café Arabica Éthiopie Premium Bio',
          details: {
            description: 'Café Arabica premium issu de l\'agriculture biologique certifiée...',
            category: 'Café en grains bio'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Produit mis à jour',
    type: ProductResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Produit non trouvé'
  })
  @ApiResponse({
    status: 409,
    description: 'Conflit (nom déjà utilisé)'
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/stock/update')
  @ApiOperation({
    summary: 'Ajuster le stock d\'un produit',
    description: 'Ajoute ou retire une quantité du stock existant'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du produit'
  })
  @ApiBody({
    type: UpdateStockDto,
    examples: {
      addStock: {
        summary: 'Ajouter du stock',
        value: { quantity: 50 }
      },
      removeStock: {
        summary: 'Retirer du stock',
        value: { quantity: -25 }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Stock mis à jour',
    type: ProductResponseDto
  })
  async updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStockDto: UpdateStockDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.updateStock(id, updateStockDto);
  }

  @Patch(':id/stock/set')
  @ApiOperation({
    summary: 'Définir le stock d\'un produit',
    description: 'Définit la quantité exacte de stock (remplace l\'ancien stock)'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du produit'
  })
  @ApiBody({
    type: SetStockDto,
    examples: {
      setStock: {
        summary: 'Définir le stock',
        value: { stock: 150 }
      },
      setStockWithStatus: {
        summary: 'Définir stock et statut',
        value: { 
          stock: 50, 
          stockStatus: 'low' 
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Stock défini',
    type: ProductResponseDto
  })
  async setStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() setStockDto: SetStockDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.setStock(id, setStockDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer (désactiver) un produit',
    description: 'Désactive un produit (suppression logique) pour le retirer du catalogue'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du produit',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({
    status: 204,
    description: 'Produit supprimé (désactivé)'
  })
  @ApiResponse({
    status: 404,
    description: 'Produit non trouvé'
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }
} 