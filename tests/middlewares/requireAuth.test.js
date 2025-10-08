import { jest } from '@jest/globals';

const verifyMock = jest.fn();

await jest.unstable_mockModule('../../src/services/authService.js', () => ({
  authService: { verify: verifyMock },
}));

const { requireAuth } = await import('../../src/middlewares/requireAuth.js');

function createRes() {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  test('returns 401 when token is missing', () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when header is not Bearer', () => {
    const req = { headers: { authorization: 'Token abc' } };
    const res = createRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('sets req.user and calls next on valid token', () => {
    verifyMock.mockReturnValue({ sub: 'u1', email: 'oleksii@example.com' });

    const req = { headers: { authorization: 'Bearer VALID.JWT' } };
    const res = createRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(verifyMock).toHaveBeenCalledWith('VALID.JWT');
    expect(req.user).toEqual({ id: 'u1', email: 'oleksii@example.com' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 when token is invalid', () => {
    verifyMock.mockImplementation(() => {
      const e = new Error('bad token');
      throw e;
    });

    const req = { headers: { authorization: 'Bearer BAD.JWT' } };
    const res = createRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(verifyMock).toHaveBeenCalledWith('BAD.JWT');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});
