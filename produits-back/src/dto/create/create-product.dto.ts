import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsBoolean,
  IsInt,
  Min, 
  Max,
  Length,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDetailsDto } from './create-product-details.dto';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nom du produit',
    example: 'Café Arabica Éthiopie Premium',
    minLength: 2,
    maxLength: 255
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255, { message: 'Le nom doit contenir entre 2 et 255 caractères' })
  name: string;

  @ApiProperty({
    description: 'Stock initial du produit',
    example: 150,
    minimum: 0
  })
  @IsInt({ message: 'Le stock doit être un nombre entier' })
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  @IsOptional()
  stock?: number = 0;

  @ApiProperty({
    description: 'Produit actif et disponible à la vente',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({
    description: 'Détails du produit (prix, description, etc.)',
    type: CreateProductDetailsDto
  })
  @ValidateNested()
  @Type(() => CreateProductDetailsDto)
  @IsNotEmpty({ message: 'Les détails du produit sont requis' })
  details: CreateProductDetailsDto;
} 