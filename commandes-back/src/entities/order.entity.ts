import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

@Entity('orders')
export class Order {
  @ApiProperty({ 
    description: 'Identifiant unique de la commande'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ 
    description: 'Identifiant du client (référence vers le service clients)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ApiProperty({ 
    description: 'Statut de la commande',
    enum: OrderStatus,
    example: OrderStatus.PENDING
  })
  @Column({ 
    type: 'enum', 
    enum: OrderStatus, 
    default: OrderStatus.PENDING 
  })
  status: OrderStatus;

  @ApiProperty({ 
    description: 'Montant total de la commande en euros',
    example: 47.98
  })
  @Column({ 
    name: 'total_amount',
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    default: 0 
  })
  totalAmount: number;

  @ApiProperty({ 
    description: 'Date de création de la commande'
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
    description: 'Articles de la commande',
    type: () => [OrderItem]
  })
  @OneToMany(() => OrderItem, item => item.order, { 
    cascade: true, 
    eager: true 
  })
  items: OrderItem[];

  // Méthodes métier
  /**
   * Calcule le montant total de la commande
   */
  calculateTotal(): number {
    if (!this.items || this.items.length === 0) {
      return 0;
    }
    return this.items.reduce((total, item) => total + item.getTotalPrice(), 0);
  }

  /**
   * Vérifie si la commande peut être modifiée
   */
  canBeModified(): boolean {
    return this.status === OrderStatus.PENDING;
  }

  /**
   * Vérifie si la commande peut être annulée
   */
  canBeCancelled(): boolean {
    return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(this.status);
  }

  /**
   * Confirme la commande
   */
  confirm(): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Seules les commandes en attente peuvent être confirmées');
    }
    this.status = OrderStatus.CONFIRMED;
  }

  /**
   * Expédie la commande
   */
  ship(): void {
    if (this.status !== OrderStatus.CONFIRMED) {
      throw new Error('Seules les commandes confirmées peuvent être expédiées');
    }
    this.status = OrderStatus.SHIPPED;
  }

  /**
   * Livre la commande
   */
  deliver(): void {
    if (this.status !== OrderStatus.SHIPPED) {
      throw new Error('Seules les commandes expédiées peuvent être livrées');
    }
    this.status = OrderStatus.DELIVERED;
  }

  /**
   * Annule la commande
   */
  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new Error('Cette commande ne peut plus être annulée');
    }
    this.status = OrderStatus.CANCELLED;
  }

  /**
   * Nombre total d'articles dans la commande
   */
  getTotalQuantity(): number {
    if (!this.items || this.items.length === 0) {
      return 0;
    }
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Vérifie si la commande est vide
   */
  isEmpty(): boolean {
    return !this.items || this.items.length === 0;
  }

  // Hooks pour mise à jour automatique du total
  @BeforeInsert()
  @BeforeUpdate()
  updateTotal() {
    this.totalAmount = this.calculateTotal();
  }
} 