import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { OrderStatus } from '../../entities';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Identifiant de l\'article' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Identifiant du produit' })
  @Expose()
  productId: string;

  @ApiProperty({ description: 'Quantité commandée' })
  @Expose()
  quantity: number;

  @ApiProperty({ description: 'Prix unitaire' })
  @Expose()
  unitPrice: number;

  @ApiProperty({ description: 'Prix total de la ligne' })
  @Expose()
  totalPrice: number;

  @ApiProperty({ description: 'Date de création' })
  @Expose()
  createdAt: Date;
}

export class OrderResponseDto {
  @ApiProperty({ 
    description: 'Identifiant unique de la commande',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @Expose()
  id: string;

  @ApiProperty({ 
    description: 'Identifiant du client',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @Expose()
  customerId: string;

  @ApiProperty({ 
    description: 'Statut de la commande',
    enum: OrderStatus,
    example: OrderStatus.PENDING
  })
  @Expose()
  status: OrderStatus;

  @ApiProperty({ 
    description: 'Montant total de la commande',
    example: 74.97
  })
  @Expose()
  totalAmount: number;

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
    description: 'Articles de la commande',
    type: [OrderItemResponseDto]
  })
  @Expose()
  @Type(() => OrderItemResponseDto)
  items: OrderItemResponseDto[];

  @ApiProperty({ 
    description: 'Nombre total d\'articles'
  })
  @Expose()
  totalQuantity: number;

  @ApiProperty({ 
    description: 'Nombre de lignes d\'articles'
  })
  @Expose()
  itemsCount: number;
}

export class OrderListResponseDto {
  @ApiProperty({ 
    description: 'Liste des commandes',
    type: [OrderResponseDto]
  })
  @Expose()
  @Type(() => OrderResponseDto)
  data: OrderResponseDto[];

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

export class OrderStatsResponseDto {
  @ApiProperty({ 
    description: 'Nombre total de commandes'
  })
  @Expose()
  totalOrders: number;

  @ApiProperty({ 
    description: 'Commandes par statut',
    example: {
      pending: 5,
      confirmed: 12,
      shipped: 8,
      delivered: 25,
      cancelled: 2
    }
  })
  @Expose()
  ordersByStatus: Record<OrderStatus, number>;

  @ApiProperty({ 
    description: 'Chiffre d\'affaires total'
  })
  @Expose()
  totalRevenue: number;

  @ApiProperty({ 
    description: 'Panier moyen'
  })
  @Expose()
  averageOrderValue: number;

  @ApiProperty({ 
    description: 'Commandes du jour'
  })
  @Expose()
  todayOrders: number;
} 