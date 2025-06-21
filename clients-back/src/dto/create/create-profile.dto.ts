import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  MaxLength,
  IsOptional,
  IsDateString,
  IsIn,
  IsBoolean
} from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({
    description: 'Prénom du profil',
    example: 'John',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Nom de famille du profil',
    example: 'Doe',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Téléphone (optionnel)',
    example: '+33123456789',
    maxLength: 20,
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Date de naissance (optionnel)',
    example: '1990-01-01',
    format: 'date',
    required: false
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({
    description: 'Genre (optionnel)',
    example: 'M',
    enum: ['M', 'F', 'O'],
    required: false
  })
  @IsOptional()
  @IsString()
  @IsIn(['M', 'F', 'O'])
  gender?: 'M' | 'F' | 'O';

  @ApiProperty({
    description: 'Profession (optionnel)',
    example: 'Développeur',
    maxLength: 150,
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  profession?: string;

  @ApiProperty({
    description: 'Statut actif du profil',
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 