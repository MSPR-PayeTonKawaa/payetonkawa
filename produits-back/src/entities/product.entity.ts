import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ProductDetails } from './product-details.entity';

export enum StockStatus {
  AVAILABLE = 'available',
  LOW = 'low', 
  RUPTURE = 'rupture'
}

@Entity('products')
export class Product {
  @ApiProperty({ 
    description: 'Identifiant unique du produit'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ 
    description: 'Nom du produit',
    example: 'Café Arabica Éthiopie'
  })
  @Column({ length: 255 })
  name: string;

  @ApiProperty({ 
    description: 'Stock disponible',
    example: 150
  })
  @Column({ type: 'integer', default: 0 })
  stock: number;

  @ApiProperty({ 
    description: 'Statut du stock',
    enum: StockStatus,
    example: StockStatus.AVAILABLE
  })
  @Column({ 
    type: 'enum', 
    enum: StockStatus, 
    name: 'stock_status',
    default: StockStatus.AVAILABLE 
  })
  stockStatus: StockStatus;

  @ApiProperty({ 
    description: 'Produit actif/disponible à la vente',
    example: true
  })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ 
    description: 'Date de création du produit'
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
    description: 'Détails du produit (prix, description, couleur)',
    type: () => ProductDetails
  })
  @OneToOne(() => ProductDetails, details => details.product, { 
    cascade: true, 
    eager: true 
  })
  @JoinColumn({ name: 'details_id' })
  details: ProductDetails;

  // Logique métier automatique pour le statut stock
  @BeforeInsert()
  @BeforeUpdate()
  updateStockStatus() {
    if (this.stock === 0) {
      this.stockStatus = StockStatus.RUPTURE;
    } else if (this.stock < 100) {
      this.stockStatus = StockStatus.LOW;
    } else {
      this.stockStatus = StockStatus.AVAILABLE;
    }
  }

  // Méthodes métier
  incrementStock(quantity: number): void {
    this.stock += quantity;
    this.updateStockStatus();
  }

  decrementStock(quantity: number): boolean {
    if (this.stock >= quantity) {
      this.stock -= quantity;
      this.updateStockStatus();
      return true;
    }
    return false; // Stock insuffisant
  }

  isAvailable(quantity: number = 1): boolean {
    return this.isActive && this.stock >= quantity;
  }
} 