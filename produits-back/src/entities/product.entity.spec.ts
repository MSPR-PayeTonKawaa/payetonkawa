import { Product, StockStatus } from './product.entity';
import { ProductDetails } from './product-details.entity';

describe('Product Entity', () => {
  let product: Product;
  let productDetails: ProductDetails;

  beforeEach(() => {
    productDetails = new ProductDetails();
    productDetails.id = 'details-uuid-1';
    productDetails.price = 25.99;
    productDetails.description = 'Test description';
    productDetails.category = 'Café en grains';
    productDetails.origin = 'Test Origin';
    productDetails.weight = '250g';
    productDetails.intensity = 7;

    product = new Product();
    product.id = 'product-uuid-1';
    product.name = 'Café Test';
    product.stock = 100;
    product.isActive = true;
    product.details = productDetails;
  });

  describe('updateStockStatus', () => {
    it('should set status to RUPTURE when stock is 0', () => {
      product.stock = 0;
      product.updateStockStatus();
      
      expect(product.stockStatus).toBe(StockStatus.RUPTURE);
    });

    it('should set status to LOW when stock is less than 100', () => {
      product.stock = 50;
      product.updateStockStatus();
      
      expect(product.stockStatus).toBe(StockStatus.LOW);
    });

    it('should set status to AVAILABLE when stock is 100 or more', () => {
      product.stock = 150;
      product.updateStockStatus();
      
      expect(product.stockStatus).toBe(StockStatus.AVAILABLE);
    });

    it('should set status to AVAILABLE when stock is exactly 100', () => {
      product.stock = 100;
      product.updateStockStatus();
      
      expect(product.stockStatus).toBe(StockStatus.AVAILABLE);
    });
  });

  describe('incrementStock', () => {
    it('should increase stock by specified quantity', () => {
      const initialStock = product.stock;
      const quantity = 50;
      
      product.incrementStock(quantity);
      
      expect(product.stock).toBe(initialStock + quantity);
    });

    it('should update stock status after incrementing', () => {
      product.stock = 50; // LOW status
      product.incrementStock(100); // Should become AVAILABLE
      
      expect(product.stock).toBe(150);
      expect(product.stockStatus).toBe(StockStatus.AVAILABLE);
    });

    it('should handle negative quantities (decrease stock)', () => {
      product.stock = 100;
      product.incrementStock(-30);
      
      expect(product.stock).toBe(70);
      expect(product.stockStatus).toBe(StockStatus.LOW);
    });
  });

  describe('decrementStock', () => {
    it('should decrease stock when sufficient quantity available', () => {
      product.stock = 100;
      const result = product.decrementStock(30);
      
      expect(result).toBe(true);
      expect(product.stock).toBe(70);
      expect(product.stockStatus).toBe(StockStatus.LOW);
    });

    it('should not decrease stock when insufficient quantity', () => {
      product.stock = 20;
      const result = product.decrementStock(30);
      
      expect(result).toBe(false);
      expect(product.stock).toBe(20); // Stock unchanged
    });

    it('should allow decreasing stock to exactly 0', () => {
      product.stock = 25;
      const result = product.decrementStock(25);
      
      expect(result).toBe(true);
      expect(product.stock).toBe(0);
      expect(product.stockStatus).toBe(StockStatus.RUPTURE);
    });

    it('should update stock status after decrementing', () => {
      product.stock = 110;
      product.decrementStock(20);
      
      expect(product.stock).toBe(90);
      expect(product.stockStatus).toBe(StockStatus.LOW);
    });
  });

  describe('isAvailable', () => {
    it('should return true when product is active and has sufficient stock', () => {
      product.isActive = true;
      product.stock = 100;
      
      expect(product.isAvailable()).toBe(true);
      expect(product.isAvailable(50)).toBe(true);
    });

    it('should return false when product is not active', () => {
      product.isActive = false;
      product.stock = 100;
      
      expect(product.isAvailable()).toBe(false);
    });

    it('should return false when insufficient stock', () => {
      product.isActive = true;
      product.stock = 10;
      
      expect(product.isAvailable(20)).toBe(false);
    });

    it('should return true when requesting exact stock amount', () => {
      product.isActive = true;
      product.stock = 50;
      
      expect(product.isAvailable(50)).toBe(true);
    });

    it('should default to quantity 1 when no quantity specified', () => {
      product.isActive = true;
      product.stock = 1;
      
      expect(product.isAvailable()).toBe(true);
      
      product.stock = 0;
      expect(product.isAvailable()).toBe(false);
    });
  });

  describe('StockStatus enum', () => {
    it('should have correct values', () => {
      expect(StockStatus.AVAILABLE).toBe('available');
      expect(StockStatus.LOW).toBe('low');
      expect(StockStatus.RUPTURE).toBe('rupture');
    });
  });
});
