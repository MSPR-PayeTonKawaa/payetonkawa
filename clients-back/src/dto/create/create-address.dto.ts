import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  MaxLength,
  IsOptional,
  Matches
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Code postal',
    example: '75001',
    pattern: '^[0-9]{5}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{5}$/, { message: 'Le code postal doit contenir exactement 5 chiffres' })
  postalCode: string;

  @ApiProperty({
    description: 'Ville',
    example: 'Paris',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'Rue et numéro (optionnel)',
    example: '123 Rue de la Paix',
    maxLength: 255,
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiProperty({
    description: 'Pays',
    example: 'France',
    maxLength: 100,
    default: 'France',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
} 