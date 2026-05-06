// Mock dependencies before requiring the module
jest.mock('../../src/db', () => ({
  query: jest.fn(),
}));

const db = require('../../src/db');
const reportTemplateService = require('../../src/services/reportTemplateService');

describe('reportTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDocumentNumber', () => {
    it('should combine prefix and template name with a hyphen', () => {
      expect(reportTemplateService.generateDocumentNumber('8D91', 'ITP-512')).toBe('8D91-ITP-512');
    });

    it('should handle simple prefix and template name', () => {
      expect(reportTemplateService.generateDocumentNumber('DOC', 'Report')).toBe('DOC-Report');
    });

    it('should handle empty template name', () => {
      expect(reportTemplateService.generateDocumentNumber('DOC', '')).toBe('DOC-');
    });
  });

  describe('validateConfig', () => {
    it('should pass with valid config', () => {
      expect(() => reportTemplateService.validateConfig({
        companyName: 'Acme Corp',
        docNumberPrefix: '8D91',
        defaultRevision: 'Rev 1',
        projectSubtitle: 'Test Project'
      })).not.toThrow();
    });

    it('should reject company_name exceeding 255 characters', () => {
      expect(() => reportTemplateService.validateConfig({
        companyName: 'a'.repeat(256)
      })).toThrow(/company_name/);
    });

    it('should reject doc_number_prefix exceeding 50 characters', () => {
      expect(() => reportTemplateService.validateConfig({
        docNumberPrefix: 'a'.repeat(51)
      })).toThrow(/doc_number_prefix/);
    });

    it('should reject doc_number_prefix with invalid characters', () => {
      expect(() => reportTemplateService.validateConfig({
        docNumberPrefix: 'DOC@123'
      })).toThrow(/alphanumeric/);
    });

    it('should allow doc_number_prefix with hyphens', () => {
      expect(() => reportTemplateService.validateConfig({
        docNumberPrefix: 'DOC-123'
      })).not.toThrow();
    });

    it('should reject default_revision exceeding 20 characters', () => {
      expect(() => reportTemplateService.validateConfig({
        defaultRevision: 'a'.repeat(21)
      })).toThrow(/default_revision/);
    });

    it('should reject project_subtitle exceeding 500 characters', () => {
      expect(() => reportTemplateService.validateConfig({
        projectSubtitle: 'a'.repeat(501)
      })).toThrow(/project_subtitle/);
    });

    it('should allow empty config object', () => {
      expect(() => reportTemplateService.validateConfig({})).not.toThrow();
    });

    it('should allow null values for optional fields', () => {
      expect(() => reportTemplateService.validateConfig({
        companyName: null,
        docNumberPrefix: null,
        defaultRevision: null,
        projectSubtitle: null
      })).not.toThrow();
    });

    it('should set statusCode 400 on validation errors', () => {
      try {
        reportTemplateService.validateConfig({ companyName: 'a'.repeat(256) });
      } catch (err) {
        expect(err.statusCode).toBe(400);
      }
    });
  });

  describe('updateReportConfig', () => {
    it('should update all fields and return stored config', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          company_name: 'Acme Corp',
          doc_number_prefix: '8D91',
          default_revision: 'Rev 1',
          project_subtitle: 'Test Subtitle'
        }]
      });

      const result = await reportTemplateService.updateReportConfig(1, {
        companyName: 'Acme Corp',
        docNumberPrefix: '8D91',
        defaultRevision: 'Rev 1',
        projectSubtitle: 'Test Subtitle'
      });

      expect(result).toEqual({
        companyName: 'Acme Corp',
        docNumberPrefix: '8D91',
        defaultRevision: 'Rev 1',
        projectSubtitle: 'Test Subtitle'
      });
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE projects SET'),
        expect.arrayContaining(['Acme Corp', '8D91', 'Rev 1', 'Test Subtitle', 1])
      );
    });

    it('should throw 404 when project not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        reportTemplateService.updateReportConfig(999, { companyName: 'Test' })
      ).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 });
    });

    it('should throw 400 for invalid config', async () => {
      await expect(
        reportTemplateService.updateReportConfig(1, { docNumberPrefix: 'INVALID@PREFIX' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should only update provided fields', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          company_name: 'New Name',
          doc_number_prefix: null,
          default_revision: 'Rev 0',
          project_subtitle: null
        }]
      });

      await reportTemplateService.updateReportConfig(1, { companyName: 'New Name' });

      const queryCall = db.query.mock.calls[0];
      // The SET clause should only contain company_name, not other fields
      const setClause = queryCall[0].split('SET')[1].split('WHERE')[0];
      expect(setClause).toContain('company_name');
      expect(setClause).not.toContain('doc_number_prefix');
      expect(setClause).not.toContain('default_revision');
      expect(setClause).not.toContain('project_subtitle');
      expect(queryCall[1]).toEqual(['New Name', 1]);
    });
  });

  describe('getResolvedConfig', () => {
    it('should return configured values when all fields are set', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          name: 'My Project',
          company_name: 'Acme Corp',
          doc_number_prefix: '8D91',
          default_revision: 'Rev 2',
          project_subtitle: 'Wastewater Treatment'
        }]
      });

      const result = await reportTemplateService.getResolvedConfig(1);

      expect(result).toEqual({
        companyName: 'Acme Corp',
        docNumberPrefix: '8D91',
        defaultRevision: 'Rev 2',
        projectSubtitle: 'Wastewater Treatment',
        documentNumber: '8D91-'
      });
    });

    it('should apply defaults when no config is set', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          name: 'My Project',
          company_name: null,
          doc_number_prefix: null,
          default_revision: null,
          project_subtitle: null
        }]
      });

      const result = await reportTemplateService.getResolvedConfig(1);

      expect(result).toEqual({
        companyName: 'My Project',
        docNumberPrefix: 'DOC',
        defaultRevision: 'Rev 0',
        projectSubtitle: '',
        documentNumber: 'DOC-'
      });
    });

    it('should throw 404 when project not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        reportTemplateService.getResolvedConfig(999)
      ).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 });
    });

    it('should use project name as company name default', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          name: 'Bolivar WWTP',
          company_name: null,
          doc_number_prefix: 'BWP',
          default_revision: null,
          project_subtitle: null
        }]
      });

      const result = await reportTemplateService.getResolvedConfig(1);

      expect(result.companyName).toBe('Bolivar WWTP');
      expect(result.docNumberPrefix).toBe('BWP');
      expect(result.defaultRevision).toBe('Rev 0');
    });
  });
});
