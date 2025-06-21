import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Address } from './address.entity';
import { Profile } from './profile.entity';
import { Company } from './company.entity';

@Entity('customers')
export class Customer {
  @ApiProperty({ 
    description: 'Identifiant unique du client',
    example: '1'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ 
    description: 'Nom d\'utilisateur unique',
    example: 'john.doe'
  })
  @Column({ unique: true, length: 100 })
  username: string;

  @ApiProperty({ 
    description: 'Nom complet du client',
    example: 'John Doe'
  })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ 
    description: 'Prénom du client',
    example: 'John'
  })
  @Column({ length: 100 })
  firstName: string;

  @ApiProperty({ 
    description: 'Nom de famille du client',
    example: 'Doe'
  })
  @Column({ length: 100 })
  lastName: string;

  @ApiProperty({ 
    description: 'Adresse email unique',
    example: 'john.doe@email.com'
  })
  @Column({ unique: true, length: 255 })
  email: string;

  @ApiProperty({ 
    description: 'Date de création du compte client'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Date de dernière mise à jour'
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ApiProperty({ 
    description: 'Adresse du client',
    type: () => Address
  })
  @OneToOne(() => Address, { cascade: true, eager: true })
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @ApiProperty({ 
    description: 'Profil détaillé du client',
    type: () => Profile
  })
  @OneToOne(() => Profile, { cascade: true, eager: true })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @ApiProperty({ 
    description: 'Entreprise du client (optionnel)',
    type: () => Company,
    required: false
  })
  @OneToOne(() => Company, { cascade: true, eager: true, nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company;
} 