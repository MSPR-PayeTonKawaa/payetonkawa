import { validate } from 'class-validator';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';

describe('OrderItem Entity', () => {
  let orderItem: OrderItem;

  beforeEach(() => {
    orderItem = new OrderItem();
  });

  describe('Entity Structure', () => {
    it('should be defined', () => {
      expect(orderItem).toBeDefined();
      expect(orderItem).toBeInstanceOf(OrderItem);
    });

    it('should have correct properties', () => {
      // Propriétés principales
      expect(orderItem).toHaveProperty('id');
      expect(orderItem).toHaveProperty('orderId');
      expect(orderItem).toHaveProperty('productId');
      expect(orderItem).toHaveProperty('quantity');
      expect(orderItem).toHaveProperty('unitPrice');
      expect(orderItem).toHaveProperty('totalPrice');
      expect(orderItem).toHaveProperty('createdAt');
      expect(orderItem).toHaveProperty('order');
      
      // Méthodes métier
      expect(typeof orderItem.getTotalPrice).toBe('function');
      expect(typeof orderItem.updateQuantity).toBe('function');
      expect(typeof orderItem.updateUnitPrice).toBe('function');
      expect(typeof orderItem.isValid).toBe('function');
      expect(typeof orderItem.getSummary).toBe('function');
    });

    it('should initialize without default values', () => {
      const newOrderItem = new OrderItem();
      // Les entités TypeORM n'ont pas de valeurs par défaut dans le constructeur
      expect(newOrderItem.quantity).toBeUndefined();
    });
  });

  describe('Business Logic', () => {
    beforeEach(() => {
      orderItem.orderId = 'order-123';
      orderItem.productId = 'product-456';
      orderItem.quantity = 3;
      orderItem.unitPrice = 15.50;
    });

    it('should calculate total price correctly', () => {
      const totalPrice = orderItem.getTotalPrice();
      expect(totalPrice).toBe(46.50); // 3 × 15.50
    });

    it('should update quantity correctly', () => {
      orderItem.updateQuantity(5);
      
      expect(orderItem.quantity).toBe(5);
      expect(orderItem.totalPrice).toBe(77.50); // 5 × 15.50
    });

    it('should reject invalid quantity updates', () => {
      expect(() => orderItem.updateQuantity(0)).toThrow('La quantité doit être supérieure à 0');
      expect(() => orderItem.updateQuantity(-1)).toThrow('La quantité doit être supérieure à 0');
    });

    it('should update unit price correctly', () => {
      orderItem.updateUnitPrice(20.00);
      
      expect(orderItem.unitPrice).toBe(20.00);
      expect(orderItem.totalPrice).toBe(60.00); // 3 × 20.00
    });

    it('should reject invalid unit price updates', () => {
      expect(() => orderItem.updateUnitPrice(0)).toThrow('Le prix unitaire doit être supérieur à 0');
      expect(() => orderItem.updateUnitPrice(-5)).toThrow('Le prix unitaire doit être supérieur à 0');
    });

    it('should validate complete order item', () => {
      expect(orderItem.isValid()).toBe(true);
    });

    it('should detect invalid order items', () => {
      // Missing product ID
      orderItem.productId = '';
      expect(orderItem.isValid()).toBe(false);

      // Reset and test missing order ID
      orderItem.productId = 'product-456';
      orderItem.orderId = '';
      expect(orderItem.isValid()).toBe(false);

      // Reset and test invalid quantity
      orderItem.orderId = 'order-123';
      orderItem.quantity = 0;
      expect(orderItem.isValid()).toBe(false);

      // Reset and test invalid unit price
      orderItem.quantity = 3;
      orderItem.unitPrice = 0;
      expect(orderItem.isValid()).toBe(false);
    });

    it('should generate correct summary', () => {
      const summary = orderItem.getSummary();
      expect(summary).toBe('3 × 15.5€ = 46.5€');
    });
  });

  describe('Relations', () => {
    it('should support order relationship', () => {
      const order = new Order();
      order.id = 'order-123';
      
      orderItem.order = order;
      orderItem.orderId = order.id;
      
      expect(orderItem.order).toBeInstanceOf(Order);
      expect(orderItem.order.id).toBe('order-123');
      expect(orderItem.orderId).toBe('order-123');
    });
  });

  describe('Basic Properties', () => {
    it('should handle properties assignment correctly', () => {
      orderItem.orderId = 'order-123';
      orderItem.productId = 'product-456';
      orderItem.quantity = 2;
      orderItem.unitPrice = 25.99;

      expect(orderItem.orderId).toBe('order-123');
      expect(orderItem.productId).toBe('product-456');
      expect(orderItem.quantity).toBe(2);
      expect(orderItem.unitPrice).toBe(25.99);
    });

    it('should handle missing required fields', () => {
      // Test with incomplete data
      orderItem.quantity = 1;
      orderItem.unitPrice = 10.00;
      // Missing orderId and productId

      expect(orderItem.quantity).toBe(1);
      expect(orderItem.unitPrice).toBe(10.00);
      expect(orderItem.orderId).toBeUndefined();
      expect(orderItem.productId).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal calculations correctly', () => {
      orderItem.quantity = 3;
      orderItem.unitPrice = 33.33;
      
      const totalPrice = orderItem.getTotalPrice();
      expect(totalPrice).toBe(99.99);
    });

    it('should handle large quantities', () => {
      orderItem.quantity = 1000;
      orderItem.unitPrice = 0.99;
      
      const totalPrice = orderItem.getTotalPrice();
      expect(totalPrice).toBe(990.00);
    });

    it('should handle fractional prices', () => {
      orderItem.quantity = 1;
      orderItem.unitPrice = 12.345; // Price with 3 decimal places
      
      const totalPrice = orderItem.getTotalPrice();
      expect(totalPrice).toBe(12.345);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain consistency after updates', () => {
      orderItem.orderId = 'order-123';
      orderItem.productId = 'product-456';
      orderItem.quantity = 2;
      orderItem.unitPrice = 10.00;
      
      // Initial state
      expect(orderItem.getTotalPrice()).toBe(20.00);
      expect(orderItem.isValid()).toBe(true);
      
      // Update quantity
      orderItem.updateQuantity(5);
      expect(orderItem.getTotalPrice()).toBe(50.00);
      expect(orderItem.isValid()).toBe(true);
      
      // Update price
      orderItem.updateUnitPrice(8.00);
      expect(orderItem.getTotalPrice()).toBe(40.00);
      expect(orderItem.isValid()).toBe(true);
    });

    it('should handle timestamp properties', () => {
      const now = new Date();
      orderItem.createdAt = now;
      
      expect(orderItem.createdAt).toEqual(now);
    });
  });

  describe('Business Rules', () => {
    it('should enforce positive quantity rule', () => {
      orderItem.quantity = 1;
      expect(() => orderItem.updateQuantity(-1)).toThrow();
      expect(() => orderItem.updateQuantity(0)).toThrow();
      expect(() => orderItem.updateQuantity(1)).not.toThrow();
    });

    it('should enforce positive price rule', () => {
      orderItem.unitPrice = 10.00;
      expect(() => orderItem.updateUnitPrice(-1)).toThrow();
      expect(() => orderItem.updateUnitPrice(0)).toThrow();
      expect(() => orderItem.updateUnitPrice(0.01)).not.toThrow();
    });

    it('should require product and order references', () => {
      orderItem.quantity = 1;
      orderItem.unitPrice = 10.00;
      
      // Without product and order IDs
      expect(orderItem.isValid()).toBe(false);
      
      // With product ID only
      orderItem.productId = 'product-123';
      expect(orderItem.isValid()).toBe(false);
      
      // With both IDs
      orderItem.orderId = 'order-456';
      expect(orderItem.isValid()).toBe(true);
    });
  });

  describe('Additional Method Coverage', () => {
    beforeEach(() => {
      orderItem.orderId = 'order-123';
      orderItem.productId = 'product-456';
      orderItem.quantity = 2;
      orderItem.unitPrice = 25.99;
    });

    describe('updateQuantity()', () => {
      it('should update quantity and recalculate total price', () => {
        orderItem.updateQuantity(5);
        expect(orderItem.quantity).toBe(5);
        expect(orderItem.totalPrice).toBe(129.95); // 5 * 25.99
      });

      it('should handle fractional quantities', () => {
        orderItem.updateQuantity(2.5);
        expect(orderItem.quantity).toBe(2.5);
        expect(orderItem.totalPrice).toBe(64.975); // 2.5 * 25.99
      });

      it('should throw error for zero quantity', () => {
        expect(() => orderItem.updateQuantity(0)).toThrow('La quantité doit être supérieure à 0');
      });

      it('should throw error for negative quantity', () => {
        expect(() => orderItem.updateQuantity(-1)).toThrow('La quantité doit être supérieure à 0');
        expect(() => orderItem.updateQuantity(-5.5)).toThrow('La quantité doit être supérieure à 0');
      });

      it('should update totalPrice after quantity change', () => {
        const originalTotal = orderItem.totalPrice;
        orderItem.updateQuantity(4);
        expect(orderItem.totalPrice).not.toBe(originalTotal);
        expect(orderItem.totalPrice).toBe(103.96); // 4 * 25.99
      });
    });

    describe('updateUnitPrice()', () => {
      it('should update unit price and recalculate total price', () => {
        orderItem.updateUnitPrice(19.99);
        expect(orderItem.unitPrice).toBe(19.99);
        expect(orderItem.totalPrice).toBe(39.98); // 2 * 19.99
      });

      it('should handle fractional prices', () => {
        orderItem.updateUnitPrice(12.345);
        expect(orderItem.unitPrice).toBe(12.345);
        expect(orderItem.totalPrice).toBe(24.69); // 2 * 12.345
      });

      it('should throw error for zero price', () => {
        expect(() => orderItem.updateUnitPrice(0)).toThrow('Le prix unitaire doit être supérieur à 0');
      });

      it('should throw error for negative price', () => {
        expect(() => orderItem.updateUnitPrice(-1)).toThrow('Le prix unitaire doit être supérieur à 0');
        expect(() => orderItem.updateUnitPrice(-10.50)).toThrow('Le prix unitaire doit être supérieur à 0');
      });

      it('should update totalPrice after price change', () => {
        const originalTotal = orderItem.totalPrice;
        orderItem.updateUnitPrice(50.00);
        expect(orderItem.totalPrice).not.toBe(originalTotal);
        expect(orderItem.totalPrice).toBe(100.00); // 2 * 50.00
      });
    });

    describe('isValid()', () => {
      it('should return true for valid order item', () => {
        expect(orderItem.isValid()).toBe(true);
      });

      it('should return false when quantity is 0', () => {
        orderItem.quantity = 0;
        expect(orderItem.isValid()).toBe(false);
      });

      it('should return false when quantity is negative', () => {
        orderItem.quantity = -1;
        expect(orderItem.isValid()).toBe(false);
      });

      it('should return false when unitPrice is 0', () => {
        orderItem.unitPrice = 0;
        expect(orderItem.isValid()).toBe(false);
      });

      it('should return false when unitPrice is negative', () => {
        orderItem.unitPrice = -5.99;
        expect(orderItem.isValid()).toBe(false);
      });

      it('should return false when productId is missing', () => {
        orderItem.productId = '';
        expect(orderItem.isValid()).toBe(false);
        
        orderItem.productId = null as any;
        expect(orderItem.isValid()).toBe(false);
        
        orderItem.productId = undefined as any;
        expect(orderItem.isValid()).toBe(false);
      });

      it('should return false when orderId is missing', () => {
        orderItem.orderId = '';
        expect(orderItem.isValid()).toBe(false);
        
        orderItem.orderId = null as any;
        expect(orderItem.isValid()).toBe(false);
        
        orderItem.orderId = undefined as any;
        expect(orderItem.isValid()).toBe(false);
      });

      it('should handle all invalid combinations', () => {
        orderItem.quantity = 0;
        orderItem.unitPrice = 0;
        orderItem.productId = '';
        orderItem.orderId = '';
        expect(orderItem.isValid()).toBe(false);
      });
    });

    describe('getSummary()', () => {
      it('should return correct summary format', () => {
        const summary = orderItem.getSummary();
        expect(summary).toBe('2 × 25.99€ = 51.98€');
      });

      it('should handle fractional quantities', () => {
        orderItem.quantity = 1.5;
        orderItem.unitPrice = 10.00;
        const summary = orderItem.getSummary();
        expect(summary).toBe('1.5 × 10€ = 15€');
      });

      it('should handle fractional prices', () => {
        orderItem.quantity = 3;
        orderItem.unitPrice = 12.345;
        const summary = orderItem.getSummary();
        expect(summary).toBe('3 × 12.345€ = 37.035000000000004€'); // Précision floating point
      });

      it('should handle high precision calculations', () => {
        orderItem.quantity = 7;
        orderItem.unitPrice = 9.99;
        const summary = orderItem.getSummary();
        expect(summary).toBe('7 × 9.99€ = 69.93€');
      });

      it('should handle single quantity items', () => {
        orderItem.quantity = 1;
        orderItem.unitPrice = 99.99;
        const summary = orderItem.getSummary();
        expect(summary).toBe('1 × 99.99€ = 99.99€');
      });
    });

    describe('getTotalPrice() edge cases', () => {
      it('should handle very small quantities', () => {
        orderItem.quantity = 0.001;
        orderItem.unitPrice = 1000;
        expect(orderItem.getTotalPrice()).toBe(1); // 0.001 * 1000
      });

      it('should handle very large quantities', () => {
        orderItem.quantity = 1000000;
        orderItem.unitPrice = 0.01;
        expect(orderItem.getTotalPrice()).toBe(10000); // 1000000 * 0.01
      });

      it('should handle high precision prices', () => {
        orderItem.quantity = 3;
        orderItem.unitPrice = 33.33333;
        expect(orderItem.getTotalPrice()).toBeCloseTo(99.99999, 5);
      });
    });
  });
});
