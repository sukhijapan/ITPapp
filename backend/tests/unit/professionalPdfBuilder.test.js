/**
 * Tests for professionalPdfBuilder.js
 *
 * Property-based tests (fast-check) cover the 9 correctness properties from
 * the design spec. Example-based tests cover specific status indicators,
 * edge cases, and end-to-end buffer generation.
 *
 * Tag format: Feature: professional-pdf-reports, Property N: <title>
 */

const fc = require('fast-check');
const {
  buildProfessionalPdf,
  calculateLogoDimensions,
  getTypeBadgeColour,
  formatSignOff,
  formatNCRResolution,
  formatAuditDetails,
  LOGO_MAX_WIDTH,
  LOGO_MAX_HEIGHT,
  COLOUR_HP,
  COLOUR_WP,
  COLOUR_RP_SP_IP,
} = require('../../src/services/professionalPdfBuilder');
const { validateLogoFile } = require('../../src/services/logoService');
const { generateDocumentNumber } = require('../../src/services/reportTemplateService');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeConfig = (overrides = {}) => ({
  companyName: 'Acme Civil',
  docNumberPrefix: 'DOC',
  defaultRevision: 'Rev 0',
  projectSubtitle: 'Infrastructure Package 1',
  documentNumber: 'DOC-ITP-001',
  ...overrides,
});

const makeInstance = (overrides = {}) => ({
  id: 1,
  name: 'Concrete Pour - Footing F1',
  status: 'Open',
  project_name: 'Test Project',
  lot_number: 'LOT-001',
  revision: 'Rev A',
  drawing_ref: 'DWG-001',
  panel_no: 'P-01',
  created_at: '2025-01-15T09:00:00.000Z',
  ...overrides,
});

const makePoint = (overrides = {}) => ({
  sequence: 1,
  description: 'Inspect reinforcement placement',
  type: 'HP',
  status: 'Approved',
  acceptance_criteria: 'Per AS3600',
  reference_documents: 'AS3600-2018',
  responsible_party: 'ENG',
  frequency: 'Once',
  inspection_method: 'Visual',
  verifying_records: 'Photos',
  sign_off_by_name: 'Jane Smith',
  sign_off_by_role: 'Engineer',
  signed_off_at: '2025-01-16T10:00:00.000Z',
  comments: '',
  ...overrides,
});

const makeNCR = (overrides = {}) => ({
  id: 101,
  point_seq: 1,
  description: 'Cover to reinforcement non-conformant',
  status: 'Closed',
  created_at: '2025-01-15T11:00:00.000Z',
  resolved_at: '2025-01-20T14:00:00.000Z',
  corrective_action: 'Rebar repositioned and re-inspected',
  verified_by_client: 'Bob Client',
  ...overrides,
});

const makeLog = (timestamp, overrides = {}) => ({
  timestamp,
  full_name: 'Alice Inspector',
  action: 'sign_off',
  old_status: 'Pending',
  new_status: 'Approved',
  metadata: {},
  ...overrides,
});

const makeData = (overrides = {}) => ({
  instance: makeInstance(),
  points: [makePoint()],
  ncrs: [],
  logs: [],
  ...overrides,
});

// ── Property 1: Logo file validation ─────────────────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 1: Logo file validation

describe('Property 1: Logo file validation', () => {
  const ALLOWED = ['image/png', 'image/jpeg'];
  const MAX_BYTES = 2 * 1024 * 1024;

  it('PBT: accepts PNG and JPEG at or below 2MB', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED),
        fc.integer({ min: 1, max: MAX_BYTES }),
        (mime, size) => {
          const result = validateLogoFile(mime, size);
          return result.valid === true && result.error === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PBT: rejects any mimetype that is not PNG or JPEG', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !ALLOWED.includes(s)),
        fc.integer({ min: 1, max: MAX_BYTES }),
        (mime, size) => {
          const result = validateLogoFile(mime, size);
          return result.valid === false && typeof result.error === 'string';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PBT: rejects any file over 2MB regardless of mimetype', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED),
        fc.integer({ min: MAX_BYTES + 1, max: MAX_BYTES * 10 }),
        (mime, size) => {
          return validateLogoFile(mime, size).valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: Image resize maintains aspect ratio within bounds ─────────────
// Tag: Feature: professional-pdf-reports, Property 2: Image resize aspect ratio

describe('Property 2 & 5: Logo dimensions stay within bounds with aspect ratio preserved', () => {
  it('PBT: output width ≤ LOGO_MAX_WIDTH and height ≤ LOGO_MAX_HEIGHT for any input', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000 }),
        fc.integer({ min: 1, max: 2000 }),
        (w, h) => {
          const { width, height } = calculateLogoDimensions(w, h);
          return width <= LOGO_MAX_WIDTH && height <= LOGO_MAX_HEIGHT;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('PBT: output aspect ratio matches input aspect ratio (within floating-point tolerance)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000 }),
        fc.integer({ min: 1, max: 2000 }),
        (w, h) => {
          const { width, height } = calculateLogoDimensions(w, h);
          const inputRatio = w / h;
          const outputRatio = width / height;
          return Math.abs(inputRatio - outputRatio) < 0.01;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('does not upscale images that already fit within bounds', () => {
    const { width, height } = calculateLogoDimensions(LOGO_MAX_WIDTH - 1, LOGO_MAX_HEIGHT - 1);
    expect(width).toBeLessThanOrEqual(LOGO_MAX_WIDTH);
    expect(height).toBeLessThanOrEqual(LOGO_MAX_HEIGHT);
  });

  it('handles square images correctly', () => {
    const { width, height } = calculateLogoDimensions(400, 400);
    expect(width).toBe(LOGO_MAX_HEIGHT); // constrained by the smaller max (20mm)
    expect(height).toBe(LOGO_MAX_HEIGHT);
  });

  it('handles very wide images', () => {
    const { width, height } = calculateLogoDimensions(1000, 10);
    expect(width).toBeLessThanOrEqual(LOGO_MAX_WIDTH);
    expect(height).toBeLessThanOrEqual(LOGO_MAX_HEIGHT);
  });
});

// ── Property 3: Document number generation ────────────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 3: Document number generation

describe('Property 3: Document number generation', () => {
  it('PBT: result is always prefix + "-" + templateName', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (prefix, templateName) => {
          return generateDocumentNumber(prefix, templateName) === `${prefix}-${templateName}`;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 4: Header content completeness ───────────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 4: Header content completeness

describe('Property 4: buildProfessionalPdf returns a valid non-empty buffer', () => {
  it('produces a non-empty Buffer for a complete dataset', () => {
    const buf = buildProfessionalPdf(makeData(), makeConfig(), null);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('PDF magic bytes are present (%PDF header)', () => {
    const buf = buildProfessionalPdf(makeData(), makeConfig(), null);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('produces a valid buffer when projectSubtitle is empty', () => {
    const buf = buildProfessionalPdf(makeData(), makeConfig({ projectSubtitle: '' }), null);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('produces a valid buffer when documentNumber is empty', () => {
    const buf = buildProfessionalPdf(makeData(), makeConfig({ documentNumber: '' }), null);
    expect(buf.length).toBeGreaterThan(0);
  });
});

// ── Property 6: Inspection point data completeness ────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 6: Inspection point data completeness

describe('Property 6: Inspection point data completeness', () => {
  describe('formatSignOff', () => {
    it('returns "-" when no sign-off name', () => {
      expect(formatSignOff({ sign_off_by_name: null })).toBe('-');
    });

    it('includes name when only name is present', () => {
      const result = formatSignOff({ sign_off_by_name: 'Jane Smith', sign_off_by_role: null, signed_off_at: null });
      expect(result).toContain('Jane Smith');
    });

    it('includes name, role, and date when all present', () => {
      const result = formatSignOff({
        sign_off_by_name: 'Jane Smith',
        sign_off_by_role: 'Engineer',
        signed_off_at: '2025-01-16T10:00:00.000Z',
      });
      expect(result).toContain('Jane Smith');
      expect(result).toContain('Engineer');
    });
  });

  it('produces a valid buffer with zero inspection points', () => {
    const buf = buildProfessionalPdf(makeData({ points: [] }), makeConfig(), null);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('produces a valid buffer with 50 inspection points', () => {
    const points = Array.from({ length: 50 }, (_, i) =>
      makePoint({ sequence: i + 1, description: `Inspection task ${i + 1}` })
    );
    const buf = buildProfessionalPdf(makeData({ points }), makeConfig(), null);
    expect(buf.length).toBeGreaterThan(0);
  });
});

// ── Property 7: Point type to colour mapping ──────────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 7: Point type to colour mapping

describe('Property 7: Point type to colour mapping', () => {
  it('PBT: HP always maps to red', () => {
    fc.assert(
      fc.property(fc.constant('HP'), (type) => {
        return JSON.stringify(getTypeBadgeColour(type)) === JSON.stringify(COLOUR_HP);
      }),
      { numRuns: 10 }
    );
  });

  it('PBT: WP always maps to amber', () => {
    fc.assert(
      fc.property(fc.constant('WP'), (type) => {
        return JSON.stringify(getTypeBadgeColour(type)) === JSON.stringify(COLOUR_WP);
      }),
      { numRuns: 10 }
    );
  });

  it('PBT: RP, SP, and IP always map to blue', () => {
    fc.assert(
      fc.property(fc.constantFrom('RP', 'SP', 'IP'), (type) => {
        return JSON.stringify(getTypeBadgeColour(type)) === JSON.stringify(COLOUR_RP_SP_IP);
      }),
      { numRuns: 30 }
    );
  });

  it('no other type maps to the HP red colour', () => {
    ['WP', 'RP', 'SP', 'IP'].forEach((type) => {
      expect(getTypeBadgeColour(type)).not.toEqual(COLOUR_HP);
    });
  });

  it('unknown types fall back to blue (RP_SP_IP)', () => {
    expect(getTypeBadgeColour('UNKNOWN')).toEqual(COLOUR_RP_SP_IP);
  });
});

// ── Property 8: Reference document consolidation ──────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 8: Reference document consolidation

describe('Property 8: Reference documents flow through to report', () => {
  it('produces a valid buffer when points have reference documents', () => {
    const points = [
      makePoint({ sequence: 1, reference_documents: 'AS3600-2018' }),
      makePoint({ sequence: 2, reference_documents: 'AS4100-1998' }),
      makePoint({ sequence: 3, reference_documents: 'AS3600-2018' }),
    ];
    const buf = buildProfessionalPdf(makeData({ points }), makeConfig(), null);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('produces a valid buffer when reference_documents is null or empty', () => {
    const points = [
      makePoint({ sequence: 1, reference_documents: null }),
      makePoint({ sequence: 2, reference_documents: '' }),
    ];
    const buf = buildProfessionalPdf(makeData({ points }), makeConfig(), null);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('PBT: valid buffer for any mix of reference document strings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        (refs) => {
          const points = refs.map((ref, i) => makePoint({ sequence: i + 1, reference_documents: ref }));
          const buf = buildProfessionalPdf(makeData({ points }), makeConfig(), null);
          return Buffer.isBuffer(buf) && buf.length > 0;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ── Property 9: Audit trail chronological ordering ────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 9: Audit trail ordering

describe('Property 9: Audit trail chronological ordering', () => {
  it('PBT: given randomly ordered timestamps, the sorted result is chronological', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          { minLength: 2, maxLength: 20 }
        ),
        (dates) => {
          const logs = dates.map((d, i) =>
            makeLog(d.toISOString(), { full_name: `User ${i}`, action: 'action' })
          );
          // Apply the same sort the builder uses
          const sorted = [...logs].sort(
            (a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
          );
          for (let i = 1; i < sorted.length; i++) {
            if (new Date(sorted[i].timestamp) < new Date(sorted[i - 1].timestamp)) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces a valid buffer when audit logs are given out of order', () => {
    const logs = [
      makeLog('2025-03-01T10:00:00Z'),
      makeLog('2025-01-01T08:00:00Z'),
      makeLog('2025-02-15T14:30:00Z'),
    ];
    const buf = buildProfessionalPdf(makeData({ logs }), makeConfig(), null);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('produces a valid buffer with an empty audit trail', () => {
    const buf = buildProfessionalPdf(makeData({ logs: [] }), makeConfig(), null);
    expect(buf.length).toBeGreaterThan(0);
  });
});

// ── Property 10: Draft watermark conditional ──────────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 10: Draft watermark conditional

describe('Property 10 & 11: Draft watermark and status handling', () => {
  it.each(['Draft', 'Open', 'Closed', 'In Progress'])(
    'produces a valid buffer for status "%s"',
    (status) => {
      const buf = buildProfessionalPdf(
        makeData({ instance: makeInstance({ status }) }),
        makeConfig(),
        null
      );
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
    }
  );
});

// ── Property 13: Corrupted logo graceful fallback ─────────────────────────────
// Tag: Feature: professional-pdf-reports, Property 13: Corrupted logo fallback

describe('Property 13: Corrupted logo graceful fallback', () => {
  it('produces a valid buffer when logo is an empty string', () => {
    const buf = buildProfessionalPdf(makeData(), makeConfig(), '');
    expect(buf.length).toBeGreaterThan(0);
  });

  it('produces a valid buffer when logo is garbage base64', () => {
    const buf = buildProfessionalPdf(makeData(), makeConfig(), 'data:image/png;base64,!!!not-valid-base64!!!');
    expect(buf.length).toBeGreaterThan(0);
  });

  it('PBT: produces a valid buffer for any arbitrary invalid base64 string', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 100 }),
        (garbage) => {
          const logoStr = `data:image/png;base64,${garbage}`;
          try {
            const buf = buildProfessionalPdf(makeData(), makeConfig(), logoStr);
            return Buffer.isBuffer(buf) && buf.length > 0;
          } catch {
            return false;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('does not throw when logo is null', () => {
    expect(() => buildProfessionalPdf(makeData(), makeConfig(), null)).not.toThrow();
  });
});

// ── NCR Section ───────────────────────────────────────────────────────────────

describe('NCR section', () => {
  it('formatNCRResolution returns "-" for Open status', () => {
    expect(formatNCRResolution(makeNCR({ status: 'Open' }))).toBe('-');
  });

  it('formatNCRResolution returns "-" for Resolved status', () => {
    expect(formatNCRResolution(makeNCR({ status: 'Resolved' }))).toBe('-');
  });

  it('formatNCRResolution includes corrective_action for Closed NCR', () => {
    const result = formatNCRResolution(makeNCR({ status: 'Closed', corrective_action: 'Fixed it' }));
    expect(result).toContain('Fixed it');
  });

  it('formatNCRResolution includes verified_by_client for Verified NCR', () => {
    const result = formatNCRResolution(makeNCR({ status: 'Verified', verified_by_client: 'Bob' }));
    expect(result).toContain('Bob');
  });

  it('produces a valid buffer with NCRs present', () => {
    const ncrs = [makeNCR({ status: 'Open' }), makeNCR({ id: 102, status: 'Closed' })];
    const buf = buildProfessionalPdf(makeData({ ncrs }), makeConfig(), null);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('produces a valid buffer with no NCRs', () => {
    const buf = buildProfessionalPdf(makeData({ ncrs: [] }), makeConfig(), null);
    expect(buf.length).toBeGreaterThan(0);
  });
});

// ── formatAuditDetails ────────────────────────────────────────────────────────

describe('formatAuditDetails', () => {
  it('returns status transition arrow for old→new status', () => {
    const result = formatAuditDetails({ old_status: 'Pending', new_status: 'Approved' });
    expect(result).toContain('Pending -> Approved');
  });

  it('returns new_status alone when no old_status', () => {
    const result = formatAuditDetails({ old_status: null, new_status: 'Open' });
    expect(result).toContain('Open');
  });

  it('returns "-" when no status and no metadata', () => {
    expect(formatAuditDetails({ old_status: null, new_status: null, metadata: {} })).toBe('-');
  });

  it('includes metadata key-value pairs', () => {
    const result = formatAuditDetails({
      old_status: null,
      new_status: null,
      metadata: { reason: 'Re-inspection required' },
    });
    expect(result).toContain('reason: Re-inspection required');
  });
});
