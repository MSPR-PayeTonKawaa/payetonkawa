import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, IsEnum } from 'class-validator';
import { CreateProductDto } from '../create/create-product.dto';
import { StockStatus } from '../../entities';

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class UpdateStockDto {
  @ApiProperty({
    description: 'Quantité à ajouter ou retirer du stock (nombre positif pour ajouter, négatif pour retirer)',
    example: 50
  })
  @IsInt({ message: 'La quantité doit être un nombre entier' })
  quantity: number;
}

export class SetStockDto {
  @ApiProperty({
    description: 'Nouveau stock total',
    example: 150,
    minimum: 0
  })
  @IsInt({ message: 'Le stock doit être un nombre entier' })
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  stock: number;

  @ApiProperty({
    description: 'Statut du stock (optionnel, sera calculé automatiquement si non fourni)',
    enum: StockStatus,
    required: false
  })
  @IsEnum(StockStatus)
  @IsOptional()
  stockStatus?: StockStatus;
} 