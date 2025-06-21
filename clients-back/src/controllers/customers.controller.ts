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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { CustomersService, FindCustomersOptions } from '../services/customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerListResponseDto,
} from '../dto';

@ApiTags('🧑‍💼 Clients')
@Controller('customers')
@UseInterceptors(ClassSerializerInterceptor)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un nouveau client',
    description: 'Crée un nouveau client avec son adresse, profil et entreprise (optionnel)'
  })
  @ApiBody({
    type: CreateCustomerDto,
    description: 'Données du client à créer',
    examples: {
      individual: {
        summary: 'Client particulier',
        value: {
          username: 'john.doe',
          name: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@email.com',
          address: {
            postalCode: '75001',
            city: 'Paris',
            street: '123 Rue de la Paix',
            country: 'France'
          },
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '+33123456789',
            birthDate: '1990-01-01',
            gender: 'M',
            profession: 'Développeur'
          }
        }
      },
      business: {
        summary: 'Client entreprise',
        value: {
          username: 'jane.smith',
          name: 'Jane Smith',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@acme.com',
          address: {
            postalCode: '69001',
            city: 'Lyon',
            street: '456 Avenue des Entreprises'
          },
          profile: {
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '+33987654321',
            profession: 'Directrice Commerciale'
          },
          company: {
            companyName: 'ACME Corporation',
            siret: '12345678901234',
            businessSector: 'Technologie',
            website: 'https://www.acme.com',
            employeeCount: 50
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Client créé avec succès',
    type: CustomerResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides'
  })
  @ApiResponse({
    status: 409,
    description: 'Email ou nom d\'utilisateur déjà utilisé'
  })
  async create(
    @Body(ValidationPipe) createCustomerDto: CreateCustomerDto
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister tous les clients',
    description: 'Récupère la liste des clients avec pagination et filtres optionnels'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre d\'éléments par page (défaut: 10, max: 100)',
    example: 10
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Recherche par nom, email ou nom d\'utilisateur',
    example: 'john'
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filtrer par ville',
    example: 'Paris'
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrer par statut actif',
    example: true
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des clients récupérée avec succès',
    type: CustomerListResponseDto
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('isActive') isActive?: string,
  ): Promise<CustomerListResponseDto> {
    const options: FindCustomersOptions = {};
    
    if (page) options.page = Math.max(1, parseInt(page, 10));
    if (limit) options.limit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    if (search) options.search = search;
    if (city) options.city = city;
    if (isActive !== undefined) {
      options.isActive = isActive === 'true';
    }

    return this.customersService.findAll(options);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un client par son ID',
    description: 'Récupère les détails complets d\'un client spécifique'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du client',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({
    status: 200,
    description: 'Client trouvé',
    type: CustomerResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Client non trouvé'
  })
  @ApiResponse({
    status: 400,
    description: 'Format UUID invalide'
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<CustomerResponseDto> {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un client',
    description: 'Met à jour partiellement ou complètement un client existant'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du client',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiBody({
    type: UpdateCustomerDto,
    description: 'Données à mettre à jour (tous les champs sont optionnels)',
    examples: {
      partial: {
        summary: 'Mise à jour partielle',
        value: {
          email: 'new.email@example.com',
          address: {
            city: 'Marseille',
            postalCode: '13001'
          }
        }
      },
      profile: {
        summary: 'Mise à jour du profil',
        value: {
          profile: {
            phone: '+33111222333',
            profession: 'Senior Developer',
            isActive: true
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Client mis à jour avec succès',
    type: CustomerResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Client non trouvé'
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides'
  })
  @ApiResponse({
    status: 409,
    description: 'Email ou nom d\'utilisateur déjà utilisé'
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateCustomerDto: UpdateCustomerDto
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un client',
    description: 'Désactive un client (soft delete) en mettant son profil comme inactif'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du client',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({
    status: 204,
    description: 'Client supprimé avec succès'
  })
  @ApiResponse({
    status: 404,
    description: 'Client non trouvé'
  })
  @ApiResponse({
    status: 400,
    description: 'Format UUID invalide'
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.customersService.remove(id);
  }

  @Get(':id/orders')
  @ApiOperation({
    summary: 'Récupérer les commandes d\'un client',
    description: 'Récupère toutes les commandes associées à un client spécifique'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du client',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({
    status: 200,
    description: 'Commandes du client récupérées',
    schema: {
      type: 'object',
      properties: {
        customerId: { type: 'string' },
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              total: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Client non trouvé'
  })
  async getCustomerOrders(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<any> {
    // Vérifier que le client existe
    await this.customersService.findOne(id);
    
    // TODO: Intégration avec le service Commandes via RabbitMQ ou API call
    return {
      customerId: id,
      orders: [],
      message: 'Intégration avec le service Commandes à implémenter'
    };
  }
} 