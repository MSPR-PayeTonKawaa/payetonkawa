import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { StockStatus } from '../../entities';

export class ProductDetailsResponseDto {
  @ApiProperty({ description: 'Identifiant des détails' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Prix unitaire en euros' })
  @Expose()
  price: number;

  @ApiProperty({ description: 'Description du produit', required: false })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Couleur', required: false })
  @Expose()
  color?: string;

  @ApiProperty({ description: 'Catégorie', required: false })
  @Expose()
  category?: string;

  @ApiProperty({ description: 'Origine', required: false })
  @Expose()
  origin?: string;

  @ApiProperty({ description: 'Poids/contenance', required: false })
  @Expose()
  weight?: string;

  @ApiProperty({ description: 'Intensité (1-10)', required: false })
  @Expose()
  intensity?: number;
}

export class ProductResponseDto {
  @ApiProperty({ 
    description: 'Identifiant unique du produit',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @Expose()
  id: string;

  @ApiProperty({ 
    description: 'Nom du produit',
    example: 'Café Arabica Éthiopie Premium'
  })
  @Expose()
  name: string;

  @ApiProperty({ 
    description: 'Stock disponible',
    example: 150
  })
  @Expose()
  stock: number;

  @ApiProperty({ 
    description: 'Statut du stock',
    enum: StockStatus,
    example: StockStatus.AVAILABLE
  })
  @Expose()
  stockStatus: StockStatus;

  @ApiProperty({ 
    description: 'Produit actif',
    example: true
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({ 
    description: 'Date de création'
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({ 
    description: 'Date de mise à jour'
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ 
    description: 'Détails du produit',
    type: ProductDetailsResponseDto
  })
  @Expose()
  @Type(() => ProductDetailsResponseDto)
  details: ProductDetailsResponseDto;
}

export class ProductListResponseDto {
  @ApiProperty({ 
    description: 'Liste des produits',
    type: [ProductResponseDto]
  })
  @Expose()
  @Type(() => ProductResponseDto)
  data: ProductResponseDto[];

  @ApiProperty({ 
    description: 'Nombre total d\'éléments'
  })
  @Expose()
  total: number;

  @ApiProperty({ 
    description: 'Page actuelle'
  })
  @Expose()
  page: number;

  @ApiProperty({ 
    description: 'Limite par page'
  })
  @Expose()
  limit: number;

  @ApiProperty({ 
    description: 'Nombre total de pages'
  })
  @Expose()
  totalPages: number;
}

export class StockAlertResponseDto {
  @ApiProperty({ 
    description: 'Produits en rupture de stock',
    type: [ProductResponseDto]
  })
  @Expose()
  @Type(() => ProductResponseDto)
  outOfStock: ProductResponseDto[];

  @ApiProperty({ 
    description: 'Produits avec stock faible',
    type: [ProductResponseDto]
  })
  @Expose()
  @Type(() => ProductResponseDto)
  lowStock: ProductResponseDto[];

  @ApiProperty({ 
    description: 'Nombre total de produits en alerte'
  })
  @Expose()
  totalAlerts: number;
} 