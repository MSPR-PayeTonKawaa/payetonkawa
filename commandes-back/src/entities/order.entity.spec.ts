import { validate } from 'class-validator';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';

describe('Order Entity', () => {
  let order: Order;

  beforeEach(() => {
    order = new Order();
  });

  describe('Entity Structure', () => {
    it('should be defined', () => {
      expect(order).toBeDefined();
      expect(order).toBeInstanceOf(Order);
    });

    it('should have correct properties', () => {
      // Propriétés principales
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('customerId');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('totalAmount');
      expect(order).toHaveProperty('items');
      
      // Propriétés de timestamps
      expect(order).toHaveProperty('createdAt');
      expect(order).toHaveProperty('updatedAt');
      
      // Méthodes métier
      expect(typeof order.calculateTotal).toBe('function');
      expect(typeof order.getTotalQuantity).toBe('function');
      expect(typeof order.canBeModified).toBe('function');
      expect(typeof order.canBeCancelled).toBe('function');
    });

    it('should initialize without default values for new entities', () => {
      const newOrder = new Order();
      // Les entités TypeORM n'ont pas de valeurs par défaut dans le constructeur
      expect(newOrder.status).toBeUndefined();
      expect(newOrder.totalAmount).toBeUndefined();
      expect(newOrder.items).toBeUndefined();
    });
  });

  describe('Order Status Enum', () => {
    it('should have all required status values', () => {
      expect(OrderStatus.PENDING).toBe('pending');
      expect(OrderStatus.CONFIRMED).toBe('confirmed');
      expect(OrderStatus.SHIPPED).toBe('shipped');
      expect(OrderStatus.DELIVERED).toBe('delivered');
      expect(OrderStatus.CANCELLED).toBe('cancelled');
    });

    it('should accept valid status values', () => {
      order.status = OrderStatus.PENDING;
      expect(order.status).toBe('pending');

      order.status = OrderStatus.CONFIRMED;
      expect(order.status).toBe('confirmed');

      order.status = OrderStatus.SHIPPED;
      expect(order.status).toBe('shipped');

      order.status = OrderStatus.DELIVERED;
      expect(order.status).toBe('delivered');

      order.status = OrderStatus.CANCELLED;
      expect(order.status).toBe('cancelled');
    });
  });

  describe('Order Relations', () => {
    it('should support order items relationship', () => {
      const orderItem = new OrderItem();
      orderItem.id = 'item-1';
      orderItem.productId = 'product-1';
      orderItem.quantity = 2;
      orderItem.unitPrice = 25.50;

      order.items = [orderItem];
      expect(order.items).toHaveLength(1);
      expect(order.items[0]).toBeInstanceOf(OrderItem);
      expect(order.items[0].productId).toBe('product-1');
    });
  });

  describe('Basic Properties', () => {
    it('should handle properties assignment correctly', () => {
      order.customerId = '550e8400-e29b-41d4-a716-446655440000';
      order.status = OrderStatus.PENDING;
      order.totalAmount = 49.98;

      expect(order.customerId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.totalAmount).toBe(49.98);
    });

    it('should handle missing customer ID', () => {
      order.status = OrderStatus.PENDING;
      order.totalAmount = 49.98;
      // customerId manquant

      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.totalAmount).toBe(49.98);
      expect(order.customerId).toBeUndefined();
    });
  });

  describe('Business Logic', () => {
    it('should calculate totals correctly', () => {
      const item1 = new OrderItem();
      item1.quantity = 2;
      item1.unitPrice = 25.00;
      item1.totalPrice = 50.00;

      const item2 = new OrderItem();
      item2.quantity = 1;
      item2.unitPrice = 15.99;
      item2.totalPrice = 15.99;

      order.items = [item1, item2];
      
      expect(order.calculateTotal()).toBe(65.99);
      expect(order.getTotalQuantity()).toBe(3);
      expect(order.isEmpty()).toBe(false);
    });

    it('should handle empty orders', () => {
      order.items = [];
      
      expect(order.calculateTotal()).toBe(0);
      expect(order.getTotalQuantity()).toBe(0);
      expect(order.isEmpty()).toBe(true);
    });

    it('should handle status transitions correctly', () => {
      // Test initial state
      order.status = OrderStatus.PENDING;
      expect(order.canBeModified()).toBe(true);
      expect(order.canBeCancelled()).toBe(true);

      // Test confirmation
      order.confirm();
      expect(order.status).toBe(OrderStatus.CONFIRMED);
      expect(order.canBeModified()).toBe(false);
      expect(order.canBeCancelled()).toBe(true);

      // Test shipping
      order.ship();
      expect(order.status).toBe(OrderStatus.SHIPPED);
      expect(order.canBeCancelled()).toBe(false);

      // Test delivery
      order.deliver();
      expect(order.status).toBe(OrderStatus.DELIVERED);
    });

    it('should prevent invalid status transitions', () => {
      // Try to ship a pending order
      order.status = OrderStatus.PENDING;
      expect(() => order.ship()).toThrow('Seules les commandes confirmées peuvent être expédiées');

      // Try to deliver a confirmed order
      order.status = OrderStatus.CONFIRMED;
      expect(() => order.deliver()).toThrow('Seules les commandes expédiées peuvent être livrées');

      // Try to confirm a confirmed order
      order.status = OrderStatus.CONFIRMED;
      expect(() => order.confirm()).toThrow('Seules les commandes en attente peuvent être confirmées');
    });

    it('should handle cancellation correctly', () => {
      // Can cancel pending order
      order.status = OrderStatus.PENDING;
      order.cancel();
      expect(order.status).toBe(OrderStatus.CANCELLED);

      // Can cancel confirmed order
      order.status = OrderStatus.CONFIRMED;
      order.cancel();
      expect(order.status).toBe(OrderStatus.CANCELLED);

      // Cannot cancel shipped order
      order.status = OrderStatus.SHIPPED;
      expect(() => order.cancel()).toThrow('Cette commande ne peut plus être annulée');

      // Cannot cancel delivered order
      order.status = OrderStatus.DELIVERED;
      expect(() => order.cancel()).toThrow('Cette commande ne peut plus être annulée');
    });

    it('should handle status transitions', () => {
      order.status = OrderStatus.PENDING;
      expect(order.status).toBe(OrderStatus.PENDING);

      order.status = OrderStatus.CONFIRMED;
      expect(order.status).toBe(OrderStatus.CONFIRMED);

      order.status = OrderStatus.SHIPPED;
      expect(order.status).toBe(OrderStatus.SHIPPED);

      order.status = OrderStatus.DELIVERED;
      expect(order.status).toBe(OrderStatus.DELIVERED);
    });

    it('should support cancellation', () => {
      order.status = OrderStatus.PENDING;
      order.status = OrderStatus.CANCELLED;
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('Timestamps', () => {
    it('should have timestamp properties', () => {
      const now = new Date();
      order.createdAt = now;
      order.updatedAt = now;

      expect(order.createdAt).toEqual(now);
      expect(order.updatedAt).toEqual(now);
    });

    it('should handle timestamp updates', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      order.createdAt = createdAt;
      order.updatedAt = updatedAt;

      expect(order.createdAt).toEqual(createdAt);
      expect(order.updatedAt).toEqual(updatedAt);
      expect(order.updatedAt.getTime()).toBeGreaterThan(order.createdAt.getTime());
    });
  });

  describe('Order States', () => {
    it('should support pending orders', () => {
      order.status = OrderStatus.PENDING;
      order.customerId = 'customer-1';
      order.totalAmount = 0;

      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.customerId).toBe('customer-1');
    });

    it('should support confirmed orders', () => {
      order.status = OrderStatus.CONFIRMED;
      order.totalAmount = 99.99;

      expect(order.status).toBe(OrderStatus.CONFIRMED);
      expect(order.totalAmount).toBe(99.99);
      expect(order.getTotalQuantity()).toBeGreaterThanOrEqual(0);
    });

    it('should support shipped orders', () => {
      order.status = OrderStatus.SHIPPED;
      
      expect(order.status).toBe(OrderStatus.SHIPPED);
    });

    it('should support delivered orders', () => {
      order.status = OrderStatus.DELIVERED;
      
      expect(order.status).toBe(OrderStatus.DELIVERED);
    });

    it('should support cancelled orders', () => {
      order.status = OrderStatus.CANCELLED;
      
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });
  });
});
