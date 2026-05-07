jest.mock('../../src/db', () => ({ query: jest.fn() }));

const db = require('../../src/db');
const { validateLogoFile, uploadLogo, getLogoBase64, deleteLogo } = require('../../src/services/logoService');

const PNG_MIME = 'image/png';
const JPEG_MIME = 'image/jpeg';
const MAX_SIZE = 2 * 1024 * 1024;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── validateLogoFile ──────────────────────────────────────────────────────────

describe('validateLogoFile', () => {
  describe('accepted types', () => {
    it('accepts image/png at exactly the limit', () => {
      expect(validateLogoFile(PNG_MIME, MAX_SIZE)).toEqual({ valid: true });
    });

    it('accepts image/jpeg at exactly the limit', () => {
      expect(validateLogoFile(JPEG_MIME, MAX_SIZE)).toEqual({ valid: true });
    });

    it('accepts image/png below the limit', () => {
      expect(validateLogoFile(PNG_MIME, 1024)).toEqual({ valid: true });
    });

    it('accepts image/jpeg below the limit', () => {
      expect(validateLogoFile(JPEG_MIME, 500)).toEqual({ valid: true });
    });
  });

  describe('rejected types', () => {
    it.each([
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'image/svg+xml',
      '',
    ])('rejects mimetype %s', (mime) => {
      const result = validateLogoFile(mime, 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/PNG|JPEG/i);
    });
  });

  describe('size limit', () => {
    it('rejects file one byte over 2MB', () => {
      const result = validateLogoFile(PNG_MIME, MAX_SIZE + 1);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/2MB/i);
    });

    it('rejects file significantly over 2MB', () => {
      expect(validateLogoFile(PNG_MIME, 10 * 1024 * 1024).valid).toBe(false);
    });

    it('accepts a 1-byte PNG', () => {
      expect(validateLogoFile(PNG_MIME, 1)).toEqual({ valid: true });
    });
  });
});

// ── uploadLogo ────────────────────────────────────────────────────────────────

describe('uploadLogo', () => {
  const projectId = 42;
  const fakeBuffer = Buffer.from('fake-image-bytes');

  it('throws 400 when mimetype is invalid', async () => {
    await expect(
      uploadLogo(projectId, fakeBuffer, 'image/gif', 1024)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when file is over 2MB', async () => {
    await expect(
      uploadLogo(projectId, fakeBuffer, PNG_MIME, MAX_SIZE + 1)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('stores base64 in DB and returns it', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const result = await uploadLogo(projectId, fakeBuffer, PNG_MIME, 1024);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result.base64DataUri).toMatch(/^data:image\/png;base64,/);
  });

  it('uses image/jpeg mime type for JPEG uploads', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const result = await uploadLogo(projectId, fakeBuffer, JPEG_MIME, 1024);
    expect(result.base64DataUri).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('encodes the buffer bytes correctly', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const buf = Buffer.from([0x01, 0x02, 0x03]);

    const result = await uploadLogo(projectId, buf, PNG_MIME, 3);
    const encoded = result.base64DataUri.split(',')[1];
    expect(Buffer.from(encoded, 'base64')).toEqual(buf);
  });
});

// ── getLogoBase64 ─────────────────────────────────────────────────────────────

describe('getLogoBase64', () => {
  it('returns null when project has no logo', async () => {
    db.query.mockResolvedValue({ rows: [{ logo_base64: null }] });
    expect(await getLogoBase64(1)).toBeNull();
  });

  it('returns null when project row is not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await getLogoBase64(999)).toBeNull();
  });

  it('returns the stored base64 data URI', async () => {
    const uri = 'data:image/jpeg;base64,abc123';
    db.query.mockResolvedValue({ rows: [{ logo_base64: uri }] });
    expect(await getLogoBase64(1)).toBe(uri);
  });
});

// ── deleteLogo ────────────────────────────────────────────────────────────────

describe('deleteLogo', () => {
  it('clears logo columns in DB', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await deleteLogo(1);

    expect(db.query).toHaveBeenCalledTimes(1);
    const sql = db.query.mock.calls[0][0];
    expect(sql).toMatch(/logo_base64 = NULL/);
  });
});
