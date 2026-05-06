# Requirements Document

## Introduction

The Professional PDF Reports feature transforms the existing basic ITP report output into a professional-grade Inspection & Test Certificate (ITC) document that matches civil infrastructure industry standards. The current report uses landscape orientation with a simple header and basic table layout. The target format matches the reference document 8D91-ITP-512, which features portrait orientation, a company logo in the header, structured document metadata (document number, revision, date), professional table formatting with inspection items, and reference document links — consistent with formal ITP/ITC documents used on major civil infrastructure projects.

This feature also introduces logo upload capability at the project level, allowing organisations to brand their reports with their company logo. The report template settings (company name, document numbering scheme, project details) are configurable per project.

## Glossary

- **Report_Service**: The backend service responsible for generating PDF reports from ITP instance data using jsPDF and jspdf-autotable.
- **Logo_Service**: The backend service responsible for uploading, storing, validating, and retrieving company logo images for use in PDF report headers.
- **Report_Template**: The configurable set of layout parameters, branding elements, and formatting rules that define the visual structure of a generated PDF report.
- **Document_Header**: The top section of the PDF report containing the company logo, document number, revision number, date, and project identification information arranged in a structured grid layout.
- **Document_Number**: A unique identifier for the report following the project's document numbering scheme (e.g., "8D91-ITP-512"), configurable per project.
- **ITC**: Inspection & Test Certificate — the formal document produced when an ITP instance is reported, serving as the official quality record.
- **Reference_Document_Link**: A reference to an external standard, specification, or drawing that is cited within an inspection point's acceptance criteria or verification requirements.
- **Report_Footer**: The bottom section of each page containing page numbers, document control information, and generation timestamp.

## Requirements

### Requirement 1: Logo Upload and Storage

**User Story:** As a Head Contractor, I want to upload my company logo to the system, so that generated PDF reports display our branding in the document header.

#### Acceptance Criteria

1. WHEN a user with Head Contractor or Admin role uploads a logo image for a project, THE Logo_Service SHALL validate that the file is a PNG or JPEG image with a maximum file size of 2MB.
2. WHEN a valid logo image is uploaded, THE Logo_Service SHALL store the image in S3 under a project-specific path and record the S3 key, file type, and upload timestamp in the project record.
3. IF the uploaded file is not a PNG or JPEG image, THEN THE Logo_Service SHALL reject the upload with an error message specifying the accepted file formats.
4. IF the uploaded file exceeds 2MB, THEN THE Logo_Service SHALL reject the upload with an error message stating the maximum allowed file size.
5. WHEN a project already has a logo and a new logo is uploaded, THE Logo_Service SHALL replace the existing logo by deleting the previous S3 object and updating the project record with the new logo reference.
6. WHEN a logo is uploaded, THE Logo_Service SHALL generate and store a base64-encoded version of the image (maximum 200px width, maintaining aspect ratio) optimised for PDF embedding.
7. THE Logo_Service SHALL return the logo as a base64 data URI when requested by the Report_Service for PDF generation.

### Requirement 2: Report Template Configuration

**User Story:** As a Head Contractor, I want to configure report template settings for my project, so that generated reports contain the correct company name, document numbering scheme, and project identification details.

#### Acceptance Criteria

1. WHEN a user with Head Contractor or Admin role updates report template settings for a project, THE Report_Service SHALL store the company name, document number prefix, default revision label, and project subtitle fields in the project record.
2. THE Report_Service SHALL use the configured company name in the Document_Header of generated reports, defaulting to the project name if no company name is configured.
3. THE Report_Service SHALL generate the Document_Number by combining the configured document number prefix with the ITP template identifier (e.g., prefix "8D91" + template "ITP-512" produces "8D91-ITP-512").
4. WHEN report template settings are not configured for a project, THE Report_Service SHALL use sensible defaults: project name as company name, sequential numbering for document numbers, and "Rev 0" as the default revision label.
5. THE Report_Service SHALL store and apply a configurable project subtitle (e.g., "Bolivar Wastewater Treatment Plant") that appears below the company name in the Document_Header.

### Requirement 3: Professional Document Header Layout

**User Story:** As a quality manager, I want the PDF report header to display the company logo alongside structured document metadata in a professional grid layout, so that the report matches the format expected by clients and contract administrators.

#### Acceptance Criteria

1. THE Report_Service SHALL generate PDF reports in portrait orientation (A4 size, 210mm × 297mm) with margins of 15mm on all sides.
2. THE Report_Service SHALL render the Document_Header as a structured grid containing: company logo (left column), document title and project subtitle (centre column), and document metadata table (right column) with document number, revision, date, and page count.
3. WHEN a project has a logo configured, THE Report_Service SHALL render the logo in the top-left area of the Document_Header with a maximum width of 40mm and maximum height of 20mm, maintaining the original aspect ratio.
4. WHEN a project does not have a logo configured, THE Report_Service SHALL render the company name as text in the logo position using bold 14pt font.
5. THE Report_Service SHALL render a document metadata table in the top-right area of the Document_Header containing rows for: Document No., Revision, Date, and Page (current of total).
6. THE Report_Service SHALL draw a horizontal rule below the Document_Header to visually separate it from the report body content.
7. THE Report_Service SHALL render the ITP instance name as the document title in bold 12pt font, centred in the header area between the logo and metadata table.

### Requirement 4: Professional Inspection Points Table

**User Story:** As a superintendent reviewing an ITP report, I want the inspection points displayed in a clearly formatted table with proper column widths and row styling, so that I can quickly identify each inspection item, its requirements, and sign-off status.

#### Acceptance Criteria

1. THE Report_Service SHALL render the inspection points in a table with columns: Item No., Description, Inspection Type, Acceptance Criteria, Reference Documents, Responsible Party, Status, and Sign-Off details.
2. THE Report_Service SHALL apply alternating row background colours (white and light grey) to improve readability of the inspection points table.
3. THE Report_Service SHALL render the inspection type using the standard abbreviations (HP, WP, RP, SP, IP) with a colour-coded badge: red background for HP (Hold Point), amber background for WP (Witness Point), and blue background for RP, SP, and IP.
4. THE Report_Service SHALL wrap long text content (description, acceptance criteria) within cells rather than truncating, adjusting row height to accommodate the content.
5. THE Report_Service SHALL render the sign-off details as the signer's name, role, and date on separate lines within the sign-off column when a point has been signed off.
6. WHEN an inspection point has status 'Approved', THE Report_Service SHALL display a green checkmark indicator alongside the status text.
7. WHEN an inspection point has status 'Rejected', THE Report_Service SHALL display a red cross indicator alongside the status text.

### Requirement 5: Reference Document Links

**User Story:** As a quality auditor, I want the report to clearly list reference documents cited in inspection points, so that I can trace each inspection requirement back to the governing specification or standard.

#### Acceptance Criteria

1. THE Report_Service SHALL render a "Reference Documents" section after the inspection points table listing all unique reference documents cited across the ITP points.
2. WHEN an inspection point has reference documents specified, THE Report_Service SHALL display the reference document identifiers in the inspection points table within the Reference Documents column.
3. THE Report_Service SHALL compile a consolidated reference document list by extracting unique references from all inspection points in the ITP instance.
4. THE Report_Service SHALL render each reference document entry with its document identifier and title (where available) in the consolidated list.
5. WHEN a reference document appears in multiple inspection points, THE Report_Service SHALL list it once in the consolidated section with the point numbers that reference it.

### Requirement 6: NCR Summary Section

**User Story:** As a project manager, I want non-conformance reports included in the ITP report with professional formatting, so that the complete quality record is contained in a single document.

#### Acceptance Criteria

1. WHEN an ITP instance has associated NCR records, THE Report_Service SHALL render an "Non-Conformance Reports" section after the reference documents section.
2. THE Report_Service SHALL render each NCR in a structured format showing: NCR number, related inspection point, description, status, raised date, and resolution details (if resolved).
3. WHEN an NCR has status 'Open', THE Report_Service SHALL highlight the NCR entry with a light red background to draw attention to unresolved issues.
4. WHEN an NCR has status 'Closed' or 'Verified', THE Report_Service SHALL display the corrective action taken and verification details.
5. IF the ITP instance has no associated NCR records, THEN THE Report_Service SHALL omit the NCR section entirely rather than displaying an empty section.

### Requirement 7: Professional Footer and Page Management

**User Story:** As a document controller, I want each page of the report to have consistent footer information including page numbers and document control details, so that printed copies can be properly managed and tracked.

#### Acceptance Criteria

1. THE Report_Service SHALL render a Report_Footer on every page containing: document number (left-aligned), "Page X of Y" (centre-aligned), and generation date and time (right-aligned).
2. THE Report_Service SHALL draw a horizontal rule above the Report_Footer to visually separate it from the page content.
3. THE Report_Service SHALL manage page breaks to avoid splitting table rows across pages — when a row would be split, the Report_Service SHALL move the entire row to the next page.
4. THE Report_Service SHALL render section headings (Inspection Points, Reference Documents, NCRs, Audit Trail) at the top of a new page when less than 30mm of space remains on the current page.
5. THE Report_Service SHALL include a "DRAFT" watermark diagonally across each page when the ITP instance status is 'Draft' or 'Open'.

### Requirement 8: Audit Trail Section

**User Story:** As a quality auditor, I want the audit trail included in the report as a final section, so that the complete history of the ITP execution is documented in the formal record.

#### Acceptance Criteria

1. THE Report_Service SHALL render an "Audit Trail" section as the final section of the report, starting on a new page.
2. THE Report_Service SHALL render audit log entries in a table with columns: Date/Time, User, Action, and Details.
3. THE Report_Service SHALL format the audit trail in chronological order from earliest to latest event.
4. THE Report_Service SHALL include all status transitions, sign-off events, NCR events, and notification events in the audit trail.
5. WHEN the audit trail exceeds 50 entries, THE Report_Service SHALL paginate the audit trail table across multiple pages maintaining the table header on each page.

### Requirement 9: Backward Compatibility

**User Story:** As a system administrator, I want the existing report generation API to continue working without breaking changes, so that current integrations are not disrupted during the transition to the new format.

#### Acceptance Criteria

1. THE Report_Service SHALL maintain the existing `generateITPReport` and `generateITPReportBuffer` function signatures and return types.
2. WHEN a project has no report template configuration and no logo, THE Report_Service SHALL generate the report using the new professional layout with default settings rather than the old landscape format.
3. THE Report_Service SHALL complete PDF generation for a typical ITP instance (up to 50 inspection points, 10 NCRs, 100 audit entries) within 5 seconds.
4. IF PDF generation fails due to a corrupted or unreadable logo image, THEN THE Report_Service SHALL fall back to rendering the company name as text and log a warning, rather than failing the entire report generation.
5. THE Report_Service SHALL generate valid PDF/A-compliant output that can be opened by standard PDF readers (Adobe Acrobat, browser PDF viewers, Preview on macOS).
