import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @ApiProperty({ 
    description: 'Identifiant unique de l\'article'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ 
    description: 'Identifiant de la commande'
  })
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ApiProperty({ 
    description: 'Identifiant du produit (référence vers le service produits)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ApiProperty({ 
    description: 'Quantité commandée',
    example: 2
  })
  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @ApiProperty({ 
    description: 'Prix unitaire au moment de la commande',
    example: 24.99
  })
  @Column({ 
    name: 'unit_price',
    type: 'decimal', 
    precision: 10, 
    scale: 2 
  })
  unitPrice: number;

  @ApiProperty({ 
    description: 'Prix total calculé (quantité × prix unitaire)',
    example: 49.98
  })
  @Column({ 
    name: 'total_price',
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    generatedType: 'STORED',
    asExpression: 'quantity * unit_price'
  })
  totalPrice: number;

  @ApiProperty({ 
    description: 'Date de création de l\'article'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ApiProperty({ 
    description: 'Commande associée',
    type: () => Order
  })
  @ManyToOne(() => Order, order => order.items, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // Méthodes métier
  /**
   * Calcule le prix total de cette ligne
   */
  getTotalPrice(): number {
    return this.quantity * this.unitPrice;
  }

  /**
   * Met à jour la quantité
   */
  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('La quantité doit être supérieure à 0');
    }
    this.quantity = newQuantity;
    this.totalPrice = this.getTotalPrice();
  }

  /**
   * Met à jour le prix unitaire
   */
  updateUnitPrice(newPrice: number): void {
    if (newPrice <= 0) {
      throw new Error('Le prix unitaire doit être supérieur à 0');
    }
    this.unitPrice = newPrice;
    this.totalPrice = this.getTotalPrice();
  }

  /**
   * Vérifie si l'article est valide
   */
  isValid(): boolean {
    return this.quantity > 0 && this.unitPrice > 0 && !!this.productId && !!this.orderId;
  }

  /**
   * Retourne un résumé de l'article
   */
  getSummary(): string {
    return `${this.quantity} × ${this.unitPrice}€ = ${this.getTotalPrice()}€`;
  }
} 