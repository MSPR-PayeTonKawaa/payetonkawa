import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Identifiant du produit à commander',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID('4', { message: 'L\'identifiant du produit doit être un UUID valide' })
  productId: string;

  @ApiProperty({
    description: 'Quantité à commander',
    example: 2,
    minimum: 1
  })
  @IsNumber({}, { message: 'La quantité doit être un nombre' })
  @IsPositive({ message: 'La quantité doit être positive' })
  @Min(1, { message: 'La quantité minimum est 1' })
  quantity: number;

  @ApiProperty({
    description: 'Prix unitaire du produit au moment de la commande',
    example: 24.99,
    minimum: 0.01
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Le prix unitaire doit être un nombre avec maximum 2 décimales' })
  @IsPositive({ message: 'Le prix unitaire doit être positif' })
  @Min(0.01, { message: 'Le prix unitaire minimum est 0.01€' })
  unitPrice: number;
} 