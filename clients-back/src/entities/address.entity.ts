import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('addresses')
export class Address {
  @ApiProperty({ 
    description: 'Identifiant unique de l\'adresse'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ 
    description: 'Code postal',
    example: '75001'
  })
  @Column({ name: 'postal_code', length: 10 })
  postalCode: string;

  @ApiProperty({ 
    description: 'Ville',
    example: 'Paris'
  })
  @Column({ length: 100 })
  city: string;

  @ApiProperty({ 
    description: 'Rue et numéro (optionnel)',
    example: '123 Rue de la Paix',
    required: false
  })
  @Column({ length: 255, nullable: true })
  street?: string;

  @ApiProperty({ 
    description: 'Pays (par défaut France)',
    example: 'France'
  })
  @Column({ length: 100, default: 'France' })
  country: string;

  @ApiProperty({ 
    description: 'Date de création de l\'adresse'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Date de dernière mise à jour'
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 