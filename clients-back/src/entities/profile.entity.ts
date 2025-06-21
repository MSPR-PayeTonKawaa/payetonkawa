import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('profiles')
export class Profile {
  @ApiProperty({ 
    description: 'Identifiant unique du profil'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ 
    description: 'Prénom du profil',
    example: 'John'
  })
  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @ApiProperty({ 
    description: 'Nom de famille du profil',
    example: 'Doe'
  })
  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @ApiProperty({ 
    description: 'Téléphone (optionnel)',
    example: '+33123456789',
    required: false
  })
  @Column({ length: 20, nullable: true })
  phone?: string;

  @ApiProperty({ 
    description: 'Date de naissance (optionnel)',
    example: '1990-01-01',
    required: false
  })
  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @ApiProperty({ 
    description: 'Genre (optionnel)',
    example: 'M',
    enum: ['M', 'F', 'O'],
    required: false
  })
  @Column({ length: 1, nullable: true })
  gender?: 'M' | 'F' | 'O';

  @ApiProperty({ 
    description: 'Profession (optionnel)',
    example: 'Développeur',
    required: false
  })
  @Column({ length: 150, nullable: true })
  profession?: string;

  @ApiProperty({ 
    description: 'Statut actif du profil',
    example: true
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Date de création du profil'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Date de dernière mise à jour'
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 