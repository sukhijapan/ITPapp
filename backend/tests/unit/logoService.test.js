// Set before module load so the module-level `const S3_BUCKET = process.env.S3_BUCKET` picks it up.
process.env.S3_BUCKET = 'test-bucket';

// babel-jest hoists variables prefixed with 'mock' above jest.mock calls,
// making them available inside the factory closure.
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn((params) => ({ command: 'put', ...params })),
  DeleteObjectCommand: jest.fn((params) => ({ command: 'delete', ...params })),
}));

jest.mock('../../src/db', () => ({ query: jest.fn() }));

const db = require('../../src/db');
const { validateLogoFile, uploadLogo, getLogoBase64, deleteLogo } = require('../../src/services/logoService');

const PNG_MIME = 'image/png';
const JPEG_MIME = 'image/jpeg';
const MAX_SIZE = 2 * 1024 * 1024;

beforeEach(() => {
  jest.clearAllMocks();
  mockSend.mockResolvedValue({});
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

  it('calls S3 PutObject and updates the database when no prior logo', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ logo_s3_key: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await uploadLogo(projectId, fakeBuffer, PNG_MIME, 1024);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(result.s3Key).toBe(`logos/${projectId}/logo.png`);
    expect(result.base64DataUri).toMatch(/^data:image\/png;base64,/);
  });

  it('uses .jpg extension for JPEG uploads', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ logo_s3_key: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await uploadLogo(projectId, fakeBuffer, JPEG_MIME, 1024);
    expect(result.s3Key).toBe(`logos/${projectId}/logo.jpg`);
  });

  it('deletes old S3 object before uploading when one already exists', async () => {
    const oldKey = 'logos/42/logo.jpg';
    db.query
      .mockResolvedValueOnce({ rows: [{ logo_s3_key: oldKey }] })
      .mockResolvedValueOnce({ rows: [] });

    await uploadLogo(projectId, fakeBuffer, PNG_MIME, 1024);

    // First call = DeleteObjectCommand, second call = PutObjectCommand
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('continues upload even if S3 delete of old logo fails', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ logo_s3_key: 'logos/42/old.jpg' }] })
      .mockResolvedValueOnce({ rows: [] });
    mockSend
      .mockRejectedValueOnce(new Error('S3 delete failed'))
      .mockResolvedValueOnce({});

    const result = await uploadLogo(projectId, fakeBuffer, PNG_MIME, 1024);
    expect(result.s3Key).toBeDefined();
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
    const uri = 'data:image/png;base64,abc123';
    db.query.mockResolvedValue({ rows: [{ logo_base64: uri }] });
    expect(await getLogoBase64(1)).toBe(uri);
  });
});

// ── deleteLogo ────────────────────────────────────────────────────────────────

describe('deleteLogo', () => {
  it('deletes from S3 and clears DB columns when logo exists', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ logo_s3_key: 'logos/1/logo.png' }] })
      .mockResolvedValueOnce({ rows: [] });

    await deleteLogo(1);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledTimes(2);
    const clearSql = db.query.mock.calls[1][0];
    expect(clearSql).toMatch(/logo_s3_key = NULL/);
  });

  it('skips S3 delete and only clears DB when no logo_s3_key', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ logo_s3_key: null }] })
      .mockResolvedValueOnce({ rows: [] });

    await deleteLogo(1);

    expect(mockSend).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('still clears DB columns even if S3 delete fails', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ logo_s3_key: 'logos/1/logo.png' }] })
      .mockResolvedValueOnce({ rows: [] });
    mockSend.mockRejectedValueOnce(new Error('S3 error'));

    await expect(deleteLogo(1)).resolves.not.toThrow();
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('skips S3 delete when no rows found for project', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await deleteLogo(999);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
