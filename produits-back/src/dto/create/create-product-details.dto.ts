import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsInt,
  Min, 
  Max,
  Length,
  IsPositive
} from 'class-validator';

export class CreateProductDetailsDto {
  @ApiProperty({
    description: 'Prix unitaire du produit en euros',
    example: 24.99,
    minimum: 0.01
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Le prix doit être un nombre avec maximum 2 décimales' })
  @IsPositive({ message: 'Le prix doit être positif' })
  @Min(0.01, { message: 'Le prix minimum est de 0.01€' })
  price: number;

  @ApiProperty({
    description: 'Description détaillée du produit',
    example: 'Café Arabica premium issu de l\'agriculture biologique, cultivé en altitude en Éthiopie. Notes florales et fruitées avec une acidité équilibrée.',
    required: false,
    maxLength: 2000
  })
  @IsString()
  @IsOptional()
  @Length(0, 2000, { message: 'La description ne peut pas dépasser 2000 caractères' })
  description?: string;

  @ApiProperty({
    description: 'Couleur ou apparence du produit',
    example: 'Brun doré',
    required: false,
    maxLength: 50
  })
  @IsString()
  @IsOptional()
  @Length(0, 50, { message: 'La couleur ne peut pas dépasser 50 caractères' })
  color?: string;

  @ApiProperty({
    description: 'Catégorie du produit',
    example: 'Café en grains',
    required: false,
    maxLength: 100
  })
  @IsString()
  @IsOptional()
  @Length(0, 100, { message: 'La catégorie ne peut pas dépasser 100 caractères' })
  category?: string;

  @ApiProperty({
    description: 'Origine géographique',
    example: 'Éthiopie, région Yirgacheffe',
    required: false,
    maxLength: 255
  })
  @IsString()
  @IsOptional()
  @Length(0, 255, { message: 'L\'origine ne peut pas dépasser 255 caractères' })
  origin?: string;

  @ApiProperty({
    description: 'Poids ou contenance',
    example: '250g',
    required: false,
    maxLength: 50
  })
  @IsString()
  @IsOptional()
  @Length(0, 50, { message: 'Le poids ne peut pas dépasser 50 caractères' })
  weight?: string;

  @ApiProperty({
    description: 'Intensité du café (1-10)',
    example: 7,
    minimum: 1,
    maximum: 10,
    required: false
  })
  @IsInt({ message: 'L\'intensité doit être un nombre entier' })
  @Min(1, { message: 'L\'intensité minimum est de 1' })
  @Max(10, { message: 'L\'intensité maximum est de 10' })
  @IsOptional()
  intensity?: number;
} 