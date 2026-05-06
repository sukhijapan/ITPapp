const { validate } = require('../../src/utils/passwordValidator');

describe('passwordValidator.validate', () => {
  describe('valid passwords', () => {
    it('accepts a password meeting all criteria', () => {
      const result = validate('Abcdef1x');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts a longer password with mixed characters', () => {
      const result = validate('MyP4ssword!');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('minimum length', () => {
    it('rejects a password shorter than 8 characters', () => {
      const result = validate('Ab1cdef');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('rejects an empty string', () => {
      const result = validate('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });

  describe('uppercase requirement', () => {
    it('rejects a password without uppercase letters', () => {
      const result = validate('abcdefg1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });
  });

  describe('lowercase requirement', () => {
    it('rejects a password without lowercase letters', () => {
      const result = validate('ABCDEFG1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });
  });

  describe('digit requirement', () => {
    it('rejects a password without digits', () => {
      const result = validate('Abcdefgh');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one digit');
    });
  });

  describe('multiple failures', () => {
    it('returns all failing criteria for a short all-lowercase password', () => {
      const result = validate('abc');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one digit');
    });
  });

  describe('edge cases', () => {
    it('handles null/undefined gracefully', () => {
      const result = validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('accepts exactly 8 characters meeting all criteria', () => {
      const result = validate('Abcdef1g');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
