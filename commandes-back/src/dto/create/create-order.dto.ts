import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, ValidateNested, ArrayMinSize, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { OrderStatus } from '../../entities';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Identifiant du client qui passe la commande',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID('4', { message: 'L\'identifiant du client doit être un UUID valide' })
  customerId: string;

  @ApiProperty({
    description: 'Articles à commander',
    type: [CreateOrderItemDto],
    example: [
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
  })
  @IsArray({ message: 'Les articles doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Une commande doit contenir au moins un article' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({
    description: 'Statut initial de la commande (optionnel, par défaut: pending)',
    enum: OrderStatus,
    required: false,
    default: OrderStatus.PENDING
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Le statut doit être une valeur valide' })
  status?: OrderStatus;
} 