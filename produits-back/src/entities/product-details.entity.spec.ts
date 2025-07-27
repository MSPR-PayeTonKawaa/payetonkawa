import { ProductDetails } from './product-details.entity';

describe('ProductDetails Entity', () => {
  let productDetails: ProductDetails;

  beforeEach(() => {
    productDetails = new ProductDetails();
    productDetails.id = 'details-uuid-1';
    productDetails.price = 25.99;
    productDetails.description = 'Café Arabica premium test';
    productDetails.color = 'Brun doré';
    productDetails.category = 'Café en grains';
    productDetails.origin = 'Éthiopie';
    productDetails.weight = '250g';
    productDetails.intensity = 7;
  });

  describe('getFormattedPrice', () => {
    it('should format price with 2 decimals and euro symbol', () => {
      productDetails.price = 25.99;
      
      expect(productDetails.getFormattedPrice()).toBe('25.99 €');
    });

    it('should format integer price with .00', () => {
      productDetails.price = 30;
      
      expect(productDetails.getFormattedPrice()).toBe('30.00 €');
    });

    it('should format price with one decimal as .X0', () => {
      productDetails.price = 25.5;
      
      expect(productDetails.getFormattedPrice()).toBe('25.50 €');
    });

    it('should handle very small prices', () => {
      productDetails.price = 0.99;
      
      expect(productDetails.getFormattedPrice()).toBe('0.99 €');
    });

    it('should handle zero price', () => {
      productDetails.price = 0;
      
      expect(productDetails.getFormattedPrice()).toBe('0.00 €');
    });
  });

  describe('isExpensive', () => {
    it('should return true when price is greater than 50', () => {
      productDetails.price = 75.99;
      
      expect(productDetails.isExpensive()).toBe(true);
    });

    it('should return false when price is less than 50', () => {
      productDetails.price = 25.99;
      
      expect(productDetails.isExpensive()).toBe(false);
    });

    it('should return false when price is exactly 50', () => {
      productDetails.price = 50;
      
      expect(productDetails.isExpensive()).toBe(false);
    });

    it('should return true when price is slightly above 50', () => {
      productDetails.price = 50.01;
      
      expect(productDetails.isExpensive()).toBe(true);
    });
  });

  describe('isPremium', () => {
    it('should return true when intensity is 8 or higher', () => {
      productDetails.intensity = 8;
      productDetails.price = 20; // Below premium price threshold
      
      expect(productDetails.isPremium()).toBe(true);
    });

    it('should return true when price is above 30', () => {
      productDetails.intensity = 5; // Below premium intensity threshold
      productDetails.price = 35;
      
      expect(productDetails.isPremium()).toBe(true);
    });

    it('should return true when both intensity and price are at premium levels', () => {
      productDetails.intensity = 9;
      productDetails.price = 40;
      
      expect(productDetails.isPremium()).toBe(true);
    });

    it('should return false when neither intensity nor price reach premium levels', () => {
      productDetails.intensity = 6;
      productDetails.price = 25;
      
      expect(productDetails.isPremium()).toBe(false);
    });

    it('should return true when intensity is exactly 8', () => {
      productDetails.intensity = 8;
      productDetails.price = 20;
      
      expect(productDetails.isPremium()).toBe(true);
    });

    it('should return true when price is exactly 30.01', () => {
      productDetails.intensity = 5;
      productDetails.price = 30.01;
      
      expect(productDetails.isPremium()).toBe(true);
    });

    it('should return false when price is exactly 30', () => {
      productDetails.intensity = 5;
      productDetails.price = 30;
      
      expect(productDetails.isPremium()).toBe(false);
    });

    it('should handle undefined intensity gracefully', () => {
      productDetails.intensity = undefined;
      productDetails.price = 25;
      
      expect(productDetails.isPremium()).toBe(false);
    });

    it('should return true when intensity is undefined but price is premium', () => {
      productDetails.intensity = undefined;
      productDetails.price = 35;
      
      expect(productDetails.isPremium()).toBe(true);
    });
  });

  describe('optional fields', () => {
    it('should handle undefined optional fields', () => {
      const details = new ProductDetails();
      details.price = 25.99;
      
      expect(details.description).toBeUndefined();
      expect(details.color).toBeUndefined();
      expect(details.category).toBeUndefined();
      expect(details.origin).toBeUndefined();
      expect(details.weight).toBeUndefined();
      expect(details.intensity).toBeUndefined();
      
      // Methods should still work
      expect(details.getFormattedPrice()).toBe('25.99 €');
      expect(details.isExpensive()).toBe(false);
      expect(details.isPremium()).toBe(false);
    });
  });
});
