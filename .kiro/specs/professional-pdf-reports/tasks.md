# Implementation Plan: Professional PDF Reports

## Overview

Transform the existing basic ITP report into a professional-grade Inspection & Test Certificate (ITC) with company logo branding, configurable report templates, portrait A4 layout, colour-coded inspection tables, reference document consolidation, NCR summary, and audit trail. Implementation builds incrementally from database schema through services to API endpoints, maintaining backward compatibility with the existing `generateITPReport` API.

## Tasks

- [x] 1. Database migration and schema setup
  - [x] 1.1 Create migration file `backend/database/migrations/007_professional_reports.sql`
    - Add `company_name VARCHAR(255)` column to projects table
    - Add `doc_number_prefix VARCHAR(50)` column to projects table
    - Add `default_revision VARCHAR(20) DEFAULT 'Rev 0'` column to projects table
    - Add `project_subtitle VARCHAR(500)` column to projects table
    - Add `logo_s3_key TEXT` column to projects table
    - Add `logo_mime_type VARCHAR(50)` column to projects table
    - Add `logo_base64 TEXT` column to projects table (pre-computed base64 for PDF embedding)
    - Add `logo_uploaded_at TIMESTAMP WITH TIME ZONE` column to projects table
    - _Requirements: 1.2, 1.6, 2.1_

- [x] 2. Logo Service implementation
  - [x] 2.1 Create `backend/src/services/logoService.js`
    - Implement `validateLogoFile(mimetype, fileSize)` — accepts only `image/png` or `image/jpeg`, max 2MB (2,097,152 bytes)
    - Implement `resizeAndEncode(imageBuffer, mimetype)` — resize to max 200px width maintaining aspect ratio, return base64 data URI
    - Implement `uploadLogo(projectId, fileBuffer, mimetype, fileSize)` — validate, resize, upload to S3 under project-specific path, store base64 + S3 key in DB
    - Implement `getLogoBase64(projectId)` — retrieve stored base64 data URI from projects table
    - Implement `deleteLogo(projectId)` — delete S3 object and clear logo columns in projects table
    - Handle replacement: when project already has a logo, delete old S3 object before storing new one
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 2.2 Write property test for logo file validation
    - **Property 1: Logo file validation**
    - **Validates: Requirements 1.1, 1.3, 1.4**
    - Use fast-check to generate arbitrary MIME types and file sizes
    - Assert `validateLogoFile` returns valid=true iff mimetype is `image/png` or `image/jpeg` AND size ≤ 2,097,152

  - [ ]* 2.3 Write property test for image resize aspect ratio
    - **Property 2: Image resize maintains aspect ratio within bounds**
    - **Validates: Requirements 1.6**
    - Use fast-check to generate random image dimensions
    - Assert output width ≤ 200px, height proportional to original aspect ratio, unchanged if original width ≤ 200px

  - [ ]* 2.4 Write unit tests for logoService
    - Test upload with valid PNG and JPEG files
    - Test rejection of invalid MIME types (image/gif, application/pdf, etc.)
    - Test rejection of files exceeding 2MB
    - Test logo replacement deletes previous S3 object
    - Test getLogoBase64 returns null when no logo exists
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.7_

- [x] 3. Report Template Service implementation
  - [x] 3.1 Create `backend/src/services/reportTemplateService.js`
    - Implement `updateReportConfig(projectId, config)` — validate and store company_name, doc_number_prefix, default_revision, project_subtitle in projects table
    - Implement `getResolvedConfig(projectId)` — fetch project record, apply defaults (project name as company name, "DOC" as prefix, "Rev 0" as revision, empty subtitle), compute document number
    - Implement `generateDocumentNumber(prefix, templateName)` — return `${prefix}-${templateName}`
    - Apply validation: company_name max 255 chars, doc_number_prefix max 50 chars alphanumeric + hyphens, default_revision max 20 chars, project_subtitle max 500 chars
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 Write property test for document number generation
    - **Property 3: Document number generation**
    - **Validates: Requirements 2.3**
    - Use fast-check to generate arbitrary non-empty prefix and template name strings
    - Assert result equals `${prefix}-${templateName}`

  - [ ]* 3.3 Write unit tests for reportTemplateService
    - Test config resolution with all fields configured
    - Test default values when nothing configured (project name as company name, "DOC" prefix, "Rev 0" revision)
    - Test updateReportConfig stores values correctly
    - Test validation rejects oversized field values
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Professional PDF Builder implementation
  - [x] 5.1 Create `backend/src/services/professionalPdfBuilder.js` — core structure
    - Implement `buildProfessionalPdf(data, config, logoBase64)` as a pure function returning a Buffer
    - Set up portrait A4 (210mm × 297mm) with 15mm margins using jsPDF
    - Implement Document_Header grid: logo area (left, max 40mm × 20mm), title area (centre), metadata table (right with doc number, revision, date, page)
    - Render logo from base64 data URI when available, fall back to company name text (bold 14pt) when not
    - Render ITP instance name as document title (bold 12pt, centred)
    - Draw horizontal rule below header
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 5.2 Implement inspection points table in professionalPdfBuilder
    - Render table with columns: Item No., Description, Inspection Type, Acceptance Criteria, Reference Documents, Responsible Party, Status, Sign-Off
    - Apply alternating row backgrounds (white / light grey #F9FAFB)
    - Render type badges with colour coding: red (220,38,38) for HP, amber (245,158,11) for WP, blue (37,99,235) for RP/SP/IP
    - Wrap long text content within cells, adjusting row height
    - Render sign-off details as name, role, date on separate lines
    - Show green checkmark for Approved status, red cross for Rejected status
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 5.3 Implement reference documents section in professionalPdfBuilder
    - Extract unique reference documents from all inspection points
    - Render consolidated list with document identifier and associated point numbers
    - Each reference listed once with all citing point sequence numbers
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.4 Implement NCR summary section in professionalPdfBuilder
    - Render NCR table with columns: NCR #, Related Point, Description, Status, Raised Date, Resolution
    - Apply light red background (#FEF2F2) for Open NCRs
    - Show corrective action and verification details for Closed/Verified NCRs
    - Omit entire section when no NCRs exist
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.5 Implement audit trail section in professionalPdfBuilder
    - Start audit trail on a new page
    - Render table with columns: Date/Time, User, Action, Details
    - Order entries chronologically (earliest to latest)
    - Maintain table header on each page when paginating
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.6 Implement footer and page management in professionalPdfBuilder
    - Render footer on every page: document number (left), "Page X of Y" (centre), generation timestamp (right)
    - Draw horizontal rule above footer
    - Manage page breaks to avoid splitting table rows
    - Move section headings to new page when less than 30mm space remains
    - Render diagonal "DRAFT" watermark on all pages when instance status is 'Draft' or 'Open'
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 5.7 Implement corrupted logo graceful fallback in professionalPdfBuilder
    - Wrap logo rendering in try/catch
    - On failure, render company name as text in logo position
    - Log warning about corrupted logo
    - Ensure valid PDF buffer is always returned
    - _Requirements: 9.4_

  - [ ]* 5.8 Write property test for header content completeness
    - **Property 4: Header content completeness**
    - **Validates: Requirements 2.2, 2.5, 3.5, 3.7**
    - Use fast-check to generate random config objects with company name, subtitle, instance name, document number, revision, date
    - Assert all values appear in the generated PDF buffer content

  - [ ]* 5.9 Write property test for logo PDF sizing constraints
    - **Property 5: Logo PDF sizing constraints**
    - **Validates: Requirements 3.3**
    - Use fast-check to generate random image dimensions
    - Assert rendered dimensions have width ≤ 40mm and height ≤ 20mm while maintaining aspect ratio

  - [ ]* 5.10 Write property test for point type to colour mapping
    - **Property 7: Point type to colour mapping**
    - **Validates: Requirements 4.3**
    - Use fast-check to generate random point types from ['HP', 'WP', 'RP', 'SP', 'IP']
    - Assert HP maps to red, WP maps to amber, RP/SP/IP map to blue

  - [ ]* 5.11 Write property test for reference document consolidation
    - **Property 8: Reference document consolidation**
    - **Validates: Requirements 5.1, 5.3, 5.5**
    - Use fast-check to generate random sets of inspection points with reference documents
    - Assert consolidated list contains exactly the unique references, each listed once, with correct point numbers

  - [ ]* 5.12 Write property test for audit trail ordering
    - **Property 12: Audit trail completeness and chronological ordering**
    - **Validates: Requirements 8.2, 8.3, 8.4**
    - Use fast-check to generate random timestamped audit entries
    - Assert all entries present and ordered chronologically

  - [ ]* 5.13 Write property test for draft watermark conditional rendering
    - **Property 11: Draft watermark conditional rendering**
    - **Validates: Requirements 7.5**
    - Use fast-check to generate random ITP statuses
    - Assert watermark present iff status is 'Draft' or 'Open'

  - [ ]* 5.14 Write property test for corrupted logo fallback
    - **Property 13: Corrupted logo graceful fallback**
    - **Validates: Requirements 9.4**
    - Use fast-check to generate random invalid base64 strings
    - Assert PDF buffer is non-zero length and no exception thrown, company name rendered as text

  - [ ]* 5.15 Write property test for inspection point data completeness
    - **Property 6: Inspection point data completeness**
    - **Validates: Requirements 4.1, 4.5**
    - Use fast-check to generate random fully-populated inspection points
    - Assert rendered table row contains sequence, description, type, criteria, references, party, status, sign-off details

  - [ ]* 5.16 Write property test for NCR data completeness
    - **Property 9: NCR data completeness**
    - **Validates: Requirements 6.2, 6.4**
    - Use fast-check to generate random NCR records with all fields
    - Assert rendered NCR entry contains NCR number, point sequence, description, status, date, and resolution details when applicable

  - [ ]* 5.17 Write property test for footer on every page
    - **Property 10: Footer present on every page**
    - **Validates: Requirements 7.1**
    - Use fast-check to generate data sets that produce varying page counts
    - Assert every page contains footer with document number, correct page numbering, and timestamp

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update Report Service to delegate to professional builder
  - [x] 7.1 Update `backend/src/services/reportService.js`
    - Import `professionalPdfBuilder`, `reportTemplateService`, and `logoService`
    - Modify `generateITPReportBuffer` to: fetch resolved config via reportTemplateService, fetch logo base64 via logoService, call `buildProfessionalPdf` with data + config + logo
    - Maintain existing function signatures (`generateITPReport`, `generateITPReportBuffer`)
    - Keep existing `fetchReportData` function for data retrieval
    - Ensure backward compatibility: when no config/logo exists, defaults produce a valid professional report
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 7.2 Write unit tests for updated reportService integration
    - Test that generateITPReportBuffer delegates to professionalPdfBuilder
    - Test backward compatibility with no config and no logo
    - Test that corrupted logo triggers fallback without failing
    - _Requirements: 9.1, 9.2, 9.4_

- [x] 8. Logo Controller and routes
  - [x] 8.1 Create `backend/src/controllers/logoController.js`
    - Implement `uploadLogo(req, res)` — POST handler using multer for file upload, calls logoService.uploadLogo, returns 201 with logo metadata
    - Implement `getLogo(req, res)` — GET handler, returns logo metadata and base64 data URI
    - Implement `deleteLogo(req, res)` — DELETE handler, calls logoService.deleteLogo, returns 204
    - Add input validation and error handling (400 for invalid files, 404 for missing project)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 8.2 Create `backend/src/routes/logos.js`
    - Define POST `/projects/:id/logo` — auth required, HC/Admin role
    - Define GET `/projects/:id/logo` — auth required, all roles
    - Define DELETE `/projects/:id/logo` — auth required, HC/Admin role
    - Configure multer middleware for file upload (memory storage, 2MB limit)
    - _Requirements: 1.1_

  - [x] 8.3 Register logo routes in `backend/src/index.js` or main router
    - Import and mount the logos router
    - _Requirements: 1.1_

- [x] 9. Report Config endpoints
  - [x] 9.1 Add report config handlers to `backend/src/controllers/projectController.js`
    - Implement `updateReportConfig(req, res)` — PUT handler, validates input, calls reportTemplateService.updateReportConfig, returns updated config
    - Implement `getReportConfig(req, res)` — GET handler, calls reportTemplateService.getResolvedConfig, returns resolved config
    - Add input validation for field lengths and allowed characters
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 9.2 Add report config routes to `backend/src/routes/projects.js`
    - Define PUT `/projects/:id/report-config` — auth required, HC/Admin role
    - Define GET `/projects/:id/report-config` — auth required, all roles
    - _Requirements: 2.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The professional PDF builder is implemented as a pure function for easy testing without database/S3 dependencies
- All existing API signatures are preserved for backward compatibility
