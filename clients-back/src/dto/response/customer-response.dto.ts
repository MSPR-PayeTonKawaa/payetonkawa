import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class AddressResponseDto {
  @ApiProperty({ description: 'Identifiant de l\'adresse' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Code postal' })
  @Expose()
  postalCode: string;

  @ApiProperty({ description: 'Ville' })
  @Expose()
  city: string;

  @ApiProperty({ description: 'Rue', required: false })
  @Expose()
  street?: string;

  @ApiProperty({ description: 'Pays' })
  @Expose()
  country: string;
}

class ProfileResponseDto {
  @ApiProperty({ description: 'Identifiant du profil' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Prénom' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Nom de famille' })
  @Expose()
  lastName: string;

  @ApiProperty({ description: 'Téléphone', required: false })
  @Expose()
  phone?: string;

  @ApiProperty({ description: 'Date de naissance', required: false })
  @Expose()
  birthDate?: Date;

  @ApiProperty({ description: 'Genre', enum: ['M', 'F', 'O'], required: false })
  @Expose()
  gender?: 'M' | 'F' | 'O';

  @ApiProperty({ description: 'Profession', required: false })
  @Expose()
  profession?: string;

  @ApiProperty({ description: 'Statut actif' })
  @Expose()
  isActive: boolean;
}

class CompanyResponseDto {
  @ApiProperty({ description: 'Identifiant de l\'entreprise' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Nom de l\'entreprise' })
  @Expose()
  companyName: string;

  @ApiProperty({ description: 'SIRET', required: false })
  @Expose()
  siret?: string;

  @ApiProperty({ description: 'Secteur d\'activité', required: false })
  @Expose()
  businessSector?: string;

  @ApiProperty({ description: 'Site web', required: false })
  @Expose()
  website?: string;

  @ApiProperty({ description: 'Nombre d\'employés', required: false })
  @Expose()
  employeeCount?: number;

  @ApiProperty({ description: 'Statut actif' })
  @Expose()
  isActive: boolean;
}

export class CustomerResponseDto {
  @ApiProperty({ 
    description: 'Identifiant unique du client',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @Expose()
  id: string;

  @ApiProperty({ 
    description: 'Nom d\'utilisateur',
    example: 'john.doe'
  })
  @Expose()
  username: string;

  @ApiProperty({ 
    description: 'Nom complet',
    example: 'John Doe'
  })
  @Expose()
  name: string;

  @ApiProperty({ 
    description: 'Prénom',
    example: 'John'
  })
  @Expose()
  firstName: string;

  @ApiProperty({ 
    description: 'Nom de famille',
    example: 'Doe'
  })
  @Expose()
  lastName: string;

  @ApiProperty({ 
    description: 'Email',
    example: 'john.doe@email.com'
  })
  @Expose()
  email: string;

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
    description: 'Adresse du client',
    type: AddressResponseDto
  })
  @Expose()
  @Type(() => AddressResponseDto)
  address: AddressResponseDto;

  @ApiProperty({ 
    description: 'Profil du client',
    type: ProfileResponseDto
  })
  @Expose()
  @Type(() => ProfileResponseDto)
  profile: ProfileResponseDto;

  @ApiProperty({ 
    description: 'Entreprise du client',
    type: CompanyResponseDto,
    required: false
  })
  @Expose()
  @Type(() => CompanyResponseDto)
  company?: CompanyResponseDto;
}

export class CustomerListResponseDto {
  @ApiProperty({ 
    description: 'Liste des clients',
    type: [CustomerResponseDto]
  })
  @Expose()
  @Type(() => CustomerResponseDto)
  data: CustomerResponseDto[];

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