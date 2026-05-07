# ADR-006: jsPDF with Auto-Table for Professional Reports

## Status

Accepted

## Context

The application generates professional ITP (Inspection and Test Plan) reports as PDF documents. These reports include:
- Cover pages with project branding (logos, company details)
- Summary tables with ITP metadata
- Detailed inspection point tables with status badges, sign-off dates, and comments
- NCR summaries linked to specific points
- Colour-coded status indicators (approved/rejected, point types)
- Alternating row backgrounds for readability

The PDF generation runs server-side on AWS Lambda (Node.js 20.x). Options considered:

1. **Puppeteer/Playwright** — Renders HTML to PDF via headless Chrome. Requires a 50+ MB Chrome binary, slow cold starts, high memory usage
2. **PDFKit** — Low-level PDF library. Powerful but requires manual layout for tables
3. **jsPDF + jspdf-autotable** — Lightweight, purpose-built for tabular reports, no binary dependencies
4. **WeasyPrint** — Python-based, not suitable for Node.js Lambda
5. **External service (e.g., DocRaptor)** — Adds external dependency and per-document cost

## Decision

We use **jsPDF** (v4.x) with the **jspdf-autotable** plugin (v5.x) for all PDF generation. The implementation is in `backend/src/services/professionalPdfBuilder.js`.

Key design choices:
- **A4 portrait** format (210×297mm) with 15mm margins
- **Colour-coded badges** for inspection point types:
  - Red for Hold Points (HP)
  - Amber for Witness Points (WP)
  - Blue for Review/Sample/Inspection Points (RP/SP/IP)
- **Status colours**: Green for Approved, Red for Rejected
- **Alternating row backgrounds** (#F9FAFB) for table readability
- **Logo support** with configurable max dimensions (40×20mm)
- **Auto-table** handles pagination, column widths, and page breaks automatically

```javascript
// backend/src/services/professionalPdfBuilder.js
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');

const PAGE_WIDTH = 210;  // A4 portrait
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
```

## Consequences

**Positive:**
- Lightweight — no binary dependencies, total package size under 2 MB
- Fast — generates a multi-page report in <500ms on Lambda (2048 MB)
- No cold start penalty — pure JavaScript, no headless browser to launch
- Professional output — auto-table handles complex table layouts, pagination, and styling
- Deterministic — same input always produces the same PDF (no browser rendering variance)
- Works in Lambda — no filesystem dependencies, generates PDF as a Buffer

**Negative:**
- Limited layout flexibility — complex non-tabular layouts are difficult (not needed for ITP reports)
- No HTML/CSS rendering — cannot reuse frontend components for PDF layout
- Manual styling — colours, fonts, and spacing must be defined programmatically
- Limited font support — custom fonts require embedding (using default Helvetica for now)
- No interactive elements — cannot create fillable forms or hyperlinks within the PDF (not required)

---

[← Back to ADR Index](./README.md) | [← Back to Documentation Index](../README.md)
