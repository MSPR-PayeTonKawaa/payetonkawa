import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsUrl,
  Matches
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Nom de l\'entreprise',
    example: 'ACME Corporation',
    minLength: 2,
    maxLength: 200
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  companyName: string;

  @ApiProperty({
    description: 'Numéro SIRET (optionnel)',
    example: '12345678901234',
    pattern: '^[0-9]{14}$',
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{14}$/, { message: 'Le SIRET doit contenir exactement 14 chiffres' })
  siret?: string;

  @ApiProperty({
    description: 'Secteur d\'activité (optionnel)',
    example: 'Technologie',
    maxLength: 150,
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessSector?: string;

  @ApiProperty({
    description: 'Site web de l\'entreprise (optionnel)',
    example: 'https://www.acme.com',
    maxLength: 255,
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: 'L\'URL du site web doit être valide' })
  @MaxLength(255)
  website?: string;

  @ApiProperty({
    description: 'Nombre d\'employés (optionnel)',
    example: 50,
    minimum: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Le nombre d\'employés doit être supérieur à 0' })
  employeeCount?: number;

  @ApiProperty({
    description: 'Statut actif de l\'entreprise',
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 