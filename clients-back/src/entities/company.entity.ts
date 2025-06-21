import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('companies')
export class Company {
  @ApiProperty({ 
    description: 'Identifiant unique de l\'entreprise'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ 
    description: 'Nom de l\'entreprise',
    example: 'ACME Corporation'
  })
  @Column({ name: 'company_name', length: 200 })
  companyName: string;

  @ApiProperty({ 
    description: 'Numéro SIRET (optionnel)',
    example: '12345678901234',
    required: false
  })
  @Column({ length: 14, nullable: true, unique: true })
  siret?: string;

  @ApiProperty({ 
    description: 'Secteur d\'activité (optionnel)',
    example: 'Technologie',
    required: false
  })
  @Column({ name: 'business_sector', length: 150, nullable: true })
  businessSector?: string;

  @ApiProperty({ 
    description: 'Site web de l\'entreprise (optionnel)',
    example: 'https://www.acme.com',
    required: false
  })
  @Column({ length: 255, nullable: true })
  website?: string;

  @ApiProperty({ 
    description: 'Nombre d\'employés (optionnel)',
    example: 50,
    required: false
  })
  @Column({ name: 'employee_count', nullable: true })
  employeeCount?: number;

  @ApiProperty({ 
    description: 'Statut actif de l\'entreprise',
    example: true
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Date de création de l\'entreprise'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Date de dernière mise à jour'
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 