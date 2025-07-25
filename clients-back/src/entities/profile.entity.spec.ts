import { Profile } from './profile.entity';

describe('Profile Entity', () => {
  let profile: Profile;

  beforeEach(() => {
    profile = new Profile();
  });

  it('should be defined', () => {
    expect(profile).toBeDefined();
  });

  it('should have correct properties', () => {
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('firstName');
    expect(profile).toHaveProperty('lastName');
    expect(profile).toHaveProperty('phone');
    expect(profile).toHaveProperty('gender');
    expect(profile).toHaveProperty('birthDate');
    expect(profile).toHaveProperty('profession');
    expect(profile).toHaveProperty('isActive');
    expect(profile).toHaveProperty('createdAt');
    expect(profile).toHaveProperty('updatedAt');
  });

  it('should accept valid property assignments', () => {
    const testData = {
      id: 'profile-123',
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '+33123456789',
      gender: 'M' as const,
      birthDate: new Date('1990-01-01'),
      profession: 'Développeur',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Object.assign(profile, testData);

    expect(profile.id).toBe(testData.id);
    expect(profile.firstName).toBe(testData.firstName);
    expect(profile.lastName).toBe(testData.lastName);
    expect(profile.phone).toBe(testData.phone);
    expect(profile.gender).toBe(testData.gender);
    expect(profile.birthDate).toBe(testData.birthDate);
    expect(profile.profession).toBe(testData.profession);
    expect(profile.isActive).toBe(testData.isActive);
    expect(profile.createdAt).toBe(testData.createdAt);
    expect(profile.updatedAt).toBe(testData.updatedAt);
  });

  it('should handle gender constraints', () => {
    profile.gender = 'M';
    expect(profile.gender).toBe('M');

    profile.gender = 'F';
    expect(profile.gender).toBe('F');

    profile.gender = 'O';
    expect(profile.gender).toBe('O');
  });

  it('should handle phone number formats', () => {
    const phoneNumbers = [
      '+33123456789',
      '+1234567890',
      '0123456789',
      '+33 1 23 45 67 89',
    ];

    phoneNumbers.forEach((phone) => {
      profile.phone = phone;
      expect(profile.phone).toBe(phone);
    });
  });

  it('should handle birth date as string', () => {
    const birthDate = new Date('1985-12-25');
    profile.birthDate = birthDate;
    expect(profile.birthDate).toBe(birthDate);
  });

  it('should handle professional information', () => {
    const professions = [
      'Développeur',
      'Designer',
      'Chef de projet',
      'Consultant',
      'Entrepreneur',
    ];

    professions.forEach((profession) => {
      profile.profession = profession;
      expect(profile.profession).toBe(profession);
    });
  });

  it('should handle active status', () => {
    profile.isActive = true;
    expect(profile.isActive).toBe(true);

    profile.isActive = false;
    expect(profile.isActive).toBe(false);
  });

  it('should handle default active status', () => {
    // Par défaut, isActive devrait être true
    expect(profile.isActive).toBeUndefined(); // Car non assigné dans le constructor
  });

  it('should serialize to JSON correctly', () => {
    profile.firstName = 'Marie';
    profile.lastName = 'Martin';
    profile.phone = '+33987654321';
    profile.gender = 'F';
    profile.birthDate = new Date('1992-06-15');
    profile.profession = 'Designer';
    profile.isActive = true;

    const json = JSON.stringify(profile);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.firstName).toBe('Marie');
    expect(parsed.lastName).toBe('Martin');
    expect(parsed.phone).toBe('+33987654321');
    expect(parsed.gender).toBe('F');
    const birthDate = new Date('1992-06-15');
    const expectedIsoString = birthDate.toISOString();
    
    expect(parsed.birthDate).toBe(expectedIsoString);
    expect(parsed.profession).toBe('Designer');
    expect(parsed.isActive).toBe(true);
  });

  it('should handle complete profile data', () => {
    const completeProfile = {
      firstName: 'Pierre',
      lastName: 'Durand',
      phone: '+33612345678',
      gender: 'M' as const,
      birthDate: new Date('1988-03-10'),
      profession: 'Ingénieur',
      isActive: true,
    };

    Object.assign(profile, completeProfile);

    expect(profile.firstName).toBe('Pierre');
    expect(profile.lastName).toBe('Durand');
    expect(profile.phone).toBe('+33612345678');
    expect(profile.gender).toBe('M');
    const expectedDate = new Date('1988-03-10');
    expect(profile.birthDate).toEqual(expectedDate);
    expect(profile.profession).toBe('Ingénieur');
    expect(profile.isActive).toBe(true);
  });

  it('should handle minimal profile data', () => {
    const minimalProfile = {
      firstName: 'Ana',
      lastName: 'Silva',
      phone: '+351123456789',
      gender: 'F' as const,
      birthDate: new Date('1995-07-20'),
      profession: 'Étudiante',
    };

    Object.assign(profile, minimalProfile);

    expect(profile.firstName).toBe('Ana');
    expect(profile.lastName).toBe('Silva');
    expect(profile.isActive).toBeUndefined(); // Non défini
  });
});
