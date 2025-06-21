import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from './product.entity';

@Entity('product_details')
export class ProductDetails {
  @ApiProperty({ 
    description: 'Identifiant unique des détails produit'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ 
    description: 'Prix unitaire du produit en euros',
    example: 24.99
  })
  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    default: 0.00 
  })
  price: number;

  @ApiProperty({ 
    description: 'Description détaillée du produit',
    example: 'Café Arabica premium issu de l\'agriculture biologique, cultivé en altitude en Éthiopie. Notes florales et fruitées avec une acidité équilibrée.'
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ 
    description: 'Couleur ou apparence du produit',
    example: 'Brun doré'
  })
  @Column({ length: 50, nullable: true })
  color?: string;

  @ApiProperty({ 
    description: 'Catégorie du produit',
    example: 'Café en grains'
  })
  @Column({ length: 100, nullable: true })
  category?: string;

  @ApiProperty({ 
    description: 'Origine géographique',
    example: 'Éthiopie, région Yirgacheffe'
  })
  @Column({ length: 255, nullable: true })
  origin?: string;

  @ApiProperty({ 
    description: 'Poids ou contenance',
    example: '250g'
  })
  @Column({ length: 50, nullable: true })
  weight?: string;

  @ApiProperty({ 
    description: 'Intensité du café (1-10)',
    example: 7
  })
  @Column({ type: 'integer', nullable: true })
  intensity?: number;

  @ApiProperty({ 
    description: 'Date de création des détails'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Date de dernière mise à jour'
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Product, product => product.details, { onDelete: 'CASCADE' })
  product: Product;

  // Méthodes métier
  getFormattedPrice(): string {
    return `${this.price.toFixed(2)} €`;
  }

  isExpensive(): boolean {
    return this.price > 50;
  }

  isPremium(): boolean {
    return (this.intensity && this.intensity >= 8) || this.price > 30;
  }
} 