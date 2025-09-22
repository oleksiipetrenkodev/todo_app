import { isPublicPath } from './publicPaths';

describe('isPublicPath', () => {
  it('should return true for public paths', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/register')).toBe(true);
  });

  it('should return false for non-public paths', () => {
    expect(isPublicPath('/dashboard')).toBe(false);
    expect(isPublicPath('/profile')).toBe(false);
  });
});
