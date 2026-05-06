const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_WIDTH = 210; // A4 portrait width in mm
const PAGE_HEIGHT = 297; // A4 portrait height in mm
const MARGIN = 15; // 15mm margins on all sides
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // usable width

// Colours
const HEADER_TEXT = [17, 24, 39]; // Dark
const FOOTER_TEXT = [107, 114, 128]; // Grey

// Inspection type badge colours
const COLOUR_HP = [220, 38, 38]; // Red for Hold Point
const COLOUR_WP = [245, 158, 11]; // Amber for Witness Point
const COLOUR_RP_SP_IP = [37, 99, 235]; // Blue for Review/Sample/Inspection Point

// Status colours
const COLOUR_APPROVED = [22, 163, 74]; // Green
const COLOUR_REJECTED = [220, 38, 38]; // Red

// Alternating row background
const ROW_ALT_BG = [249, 250, 251]; // Light grey #F9FAFB

// Logo constraints
const LOGO_MAX_WIDTH = 40; // mm
const LOGO_MAX_HEIGHT = 20; // mm

// ── Helpers ──────────────────────────────────────────────────────────────────

const safe = (v) => (v == null ? '-' : String(v));

const fmtDate = (v) => {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleDateString('en-AU');
  } catch {
    return '-';
  }
};

const fmtDateTime = (v) => {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

/**
 * Calculates logo dimensions to fit within max bounds while maintaining aspect ratio.
 */
function calculateLogoDimensions(imgWidth, imgHeight) {
  if (!imgWidth || !imgHeight) return { width: LOGO_MAX_WIDTH, height: LOGO_MAX_HEIGHT };

  let width = LOGO_MAX_WIDTH;
  let height = (imgHeight / imgWidth) * width;

  if (height > LOGO_MAX_HEIGHT) {
    height = LOGO_MAX_HEIGHT;
    width = (imgWidth / imgHeight) * height;
  }

  return { width, height };
}

// ── Document Header ──────────────────────────────────────────────────────────

function renderHeader(doc, data, config, logoBase64) {
  const headerTop = MARGIN;
  const headerHeight = 22;

  // ── Left column: Logo or company name ──
  const logoX = MARGIN;
  const logoY = headerTop;

  if (logoBase64) {
    try {
      const format = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
      const dims = calculateLogoDimensions(LOGO_MAX_WIDTH * 5, LOGO_MAX_HEIGHT * 5);
      doc.addImage(logoBase64, format, logoX, logoY, dims.width, dims.height);
    } catch (e) {
      console.warn('[ProfessionalPdfBuilder] Failed to render logo, falling back to company name text:', e.message);
      renderCompanyNameText(doc, config.companyName, logoX, logoY);
    }
  } else {
    renderCompanyNameText(doc, config.companyName, logoX, logoY);
  }

  // ── Centre column: Document title ──
  const centreX = PAGE_WIDTH / 2;
  const titleY = headerTop + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...HEADER_TEXT);
  doc.text(safe(data.instance.name), centreX, titleY, { align: 'center' });

  if (config.projectSubtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(config.projectSubtitle, centreX, titleY + 5, { align: 'center' });
  }

  // ── Right column: Metadata table ──
  const metaX = PAGE_WIDTH - MARGIN - 45;
  const metaY = headerTop;
  const metaLineHeight = 4.5;

  doc.setFontSize(8);
  doc.setTextColor(...HEADER_TEXT);

  const metaRows = [
    ['Doc No:', safe(config.documentNumber)],
    ['Revision:', safe(config.defaultRevision)],
    ['Date:', fmtDate(data.instance.created_at || new Date().toISOString())],
  ];

  metaRows.forEach((row, i) => {
    const rowY = metaY + 2 + i * metaLineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], metaX, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], metaX + 18, rowY);
  });

  // ── Horizontal rule below header ──
  const ruleY = headerTop + headerHeight + 2;
  doc.setDrawColor(...HEADER_TEXT);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, ruleY, PAGE_WIDTH - MARGIN, ruleY);

  return ruleY + 4;
}

function renderCompanyNameText(doc, companyName, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...HEADER_TEXT);
  doc.text(safe(companyName), x, y + 10);
}

// ── ITP Metadata Table ───────────────────────────────────────────────────────

/**
 * Renders the ITP instance metadata table below the header.
 * Shows: ITP name, Contract/Project, Work Area, Lot, Revision, Drawing Ref, etc.
 */
function renderMetadataTable(doc, data, config, startY) {
  let y = startY;

  const instance = data.instance;

  // Build metadata rows as key-value pairs in a 2-column layout
  const leftCol = [
    ['Inspection Test Plan:', safe(instance.name)],
    ['Contract Name:', safe(instance.project_name)],
    ['Work Area:', safe(instance.panel_no)],
    ['Lot:', safe(instance.lot_number)],
  ];

  const rightCol = [
    ['Document No:', safe(config.documentNumber)],
    ['Report Generated:', fmtDate(new Date().toISOString())],
    ['Revision:', safe(instance.revision || config.defaultRevision)],
    ['Drawing Ref:', safe(instance.drawing_ref)],
  ];

  doc.setFontSize(8);
  doc.setTextColor(...HEADER_TEXT);

  const lineHeight = 4.5;
  const leftLabelX = MARGIN;
  const leftValueX = MARGIN + 32;
  const rightLabelX = MARGIN + CONTENT_WIDTH / 2;
  const rightValueX = MARGIN + CONTENT_WIDTH / 2 + 30;

  const maxRows = Math.max(leftCol.length, rightCol.length);

  for (let i = 0; i < maxRows; i++) {
    const rowY = y + i * lineHeight;

    if (leftCol[i]) {
      doc.setFont('helvetica', 'bold');
      doc.text(leftCol[i][0], leftLabelX, rowY);
      doc.setFont('helvetica', 'normal');
      doc.text(leftCol[i][1], leftValueX, rowY);
    }

    if (rightCol[i]) {
      doc.setFont('helvetica', 'bold');
      doc.text(rightCol[i][0], rightLabelX, rowY);
      doc.setFont('helvetica', 'normal');
      doc.text(rightCol[i][1], rightValueX, rowY);
    }
  }

  y += maxRows * lineHeight + 4;

  // Draw a line below metadata
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  return y + 4;
}

// ── Inspection Points Table ───────────────────────────────────────────────────

function getTypeBadgeColour(type) {
  switch (type) {
    case 'HP': return COLOUR_HP;
    case 'WP': return COLOUR_WP;
    case 'RP':
    case 'SP':
    case 'IP': return COLOUR_RP_SP_IP;
    default: return COLOUR_RP_SP_IP;
  }
}

function formatSignOff(point) {
  if (!point.sign_off_by_name) return '-';
  const lines = [point.sign_off_by_name];
  if (point.sign_off_by_role) lines.push(point.sign_off_by_role);
  if (point.signed_off_at) lines.push(fmtDate(point.signed_off_at));
  return lines.join('\n');
}

function formatStatus(status) {
  if (!status) return '-';
  // Use plain text instead of unicode symbols that don't render in jsPDF
  return status;
}

/**
 * Renders the inspection points table matching the original ITP document format.
 * Columns: No., Inspection/Test Point Task Detail, Action (Hold/Surveillance/Witness),
 * Task Frequency, Inspection/Test Method, Acceptance Criteria, Verification Records,
 * Records Provided, Completed By, Date Complete, Review By, Date Reviewed, Comments
 */
function renderInspectionPointsTable(doc, points, startY) {
  if (!points || points.length === 0) return startY;

  let y = startY;

  if (y > PAGE_HEIGHT - MARGIN - 30) {
    doc.addPage();
    y = MARGIN + 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...HEADER_TEXT);
  doc.text('Inspection Points', MARGIN, y);
  y += 4;

  // Map point type to full action name
  const typeToAction = (type) => {
    switch (type) {
      case 'HP': return 'Hold';
      case 'WP': return 'Witness';
      case 'RP': return 'Review';
      case 'SP': return 'Surveillance';
      case 'IP': return 'Inspection';
      default: return safe(type);
    }
  };

  const body = points.map((p) => [
    safe(p.sequence),
    safe(p.description),
    typeToAction(p.type),
    safe(p.frequency),
    safe(p.inspection_method),
    safe(p.acceptance_criteria),
    safe(p.verifying_records),
    safe(p.reference_documents),
    p.sign_off_by_name || '-',
    p.signed_off_at ? fmtDate(p.signed_off_at) : '-',
    p.sign_off_by_role || '-',
    p.signed_off_at ? fmtDate(p.signed_off_at) : '-',
    safe(p.comments),
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'No.',
      'Inspection /\nTest Point\nTask Detail',
      'Action\n(Hold,\nSurveillance,\nWitness)',
      'Task\nFrequency',
      'Inspection /\nTest Method',
      'Acceptance\nCriteria',
      'Verification\nRecords',
      'Records\nProvided',
      'Completed\nBy',
      'Date\nComplete',
      'Review\nBy',
      'Date\nReviewed',
      'Comments',
    ]],
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_TEXT,
      textColor: [255, 255, 255],
      fontSize: 5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 1,
    },
    bodyStyles: {
      fontSize: 5.5,
      cellPadding: 1,
      textColor: HEADER_TEXT,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },    // No.
      1: { cellWidth: 22 },                      // Task Detail
      2: { cellWidth: 14, halign: 'center' },    // Action
      3: { cellWidth: 12 },                      // Frequency
      4: { cellWidth: 14 },                      // Method
      5: { cellWidth: 18 },                      // Acceptance Criteria
      6: { cellWidth: 16 },                      // Verification Records
      7: { cellWidth: 16 },                      // Records Provided
      8: { cellWidth: 14 },                      // Completed By
      9: { cellWidth: 12, halign: 'center' },    // Date Complete
      10: { cellWidth: 14 },                     // Review By
      11: { cellWidth: 12, halign: 'center' },   // Date Reviewed
      12: { cellWidth: 9 },                      // Comments
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 1,
      lineWidth: 0.2,
      lineColor: [150, 150, 150],
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data) => {
      if (data.section !== 'body') return;

      const rowIndex = data.row.index;

      // Alternating row backgrounds
      if (rowIndex % 2 === 1) {
        data.cell.styles.fillColor = ROW_ALT_BG;
      }

      // Action column (index 2) - colour-coded
      if (data.column.index === 2) {
        const point = points[rowIndex];
        if (point) {
          const colour = getTypeBadgeColour(point.type);
          data.cell.styles.textColor = colour;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  return doc.lastAutoTable.finalY + 6;
}

// ── Signature Section ─────────────────────────────────────────────────────────

/**
 * Renders the sign-off / signature table with blank rows for manual signing.
 * Shows standard ITP roles: Engineer, Quality Manager, Project Engineer, Client/Designer Rep.
 * The Signature column is left blank for physical signing on printed copies.
 */
function renderSignatureSection(doc, data, startY) {
  // Always start on a new page
  doc.addPage();
  let y = MARGIN + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...HEADER_TEXT);
  doc.text('Sign-Off', MARGIN, y);
  y += 4;

  // Standard ITP sign-off roles (blank for manual signing)
  const signOffRows = [
    ['Task Assignee / Engineer', '', '', ''],
    ['Quality Manager', '', '', ''],
    ['Project Engineer', '', '', ''],
    ['Client / Designer Rep', '', '', ''],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Signature', 'Date', 'Comments']],
    body: signOffRows,
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_TEXT,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: HEADER_TEXT,
      minCellHeight: 12,
    },
    columnStyles: {
      0: { cellWidth: 45 },   // Name (role label)
      1: { cellWidth: 50 },   // Signature (blank)
      2: { cellWidth: 30, halign: 'center' },   // Date
      3: { cellWidth: 55 },   // Comments
    },
    styles: {
      overflow: 'linebreak',
      lineWidth: 0.3,
      lineColor: [100, 100, 100],
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return doc.lastAutoTable.finalY + 6;
}

// ── NCR Summary Section ───────────────────────────────────────────────────────

const NCR_OPEN_BG = [254, 242, 242]; // Light Red #FEF2F2

function formatNCRResolution(ncr) {
  if (ncr.status !== 'Closed' && ncr.status !== 'Verified') return '-';
  const lines = [];
  if (ncr.corrective_action) lines.push(ncr.corrective_action);
  if (ncr.verified_by_client) lines.push('Verified by: ' + ncr.verified_by_client);
  return lines.length > 0 ? lines.join('\n') : '-';
}

function renderNCRSection(doc, ncrs, startY) {
  if (!ncrs || ncrs.length === 0) return startY;

  let y = startY;

  if (y > PAGE_HEIGHT - MARGIN - 30) {
    doc.addPage();
    y = MARGIN + 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOUR_REJECTED);
  doc.text('Non-Conformance Reports', MARGIN, y);
  y += 4;

  const body = ncrs.map((ncr) => [
    safe(ncr.id),
    safe(ncr.point_seq),
    safe(ncr.description),
    safe(ncr.status),
    fmtDate(ncr.created_at),
    formatNCRResolution(ncr),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['NCR #', 'Related Point', 'Description', 'Status', 'Raised Date', 'Resolution']],
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_TEXT,
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: HEADER_TEXT,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 45 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 58 },
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2,
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const ncr = ncrs[data.row.index];
      if (ncr && ncr.status === 'Open') {
        data.cell.styles.fillColor = NCR_OPEN_BG;
      }
    },
  });

  return doc.lastAutoTable.finalY + 6;
}

// ── Audit Trail Section ───────────────────────────────────────────────────────

/**
 * Formats audit details using only ASCII-safe characters.
 * Uses -> instead of unicode arrow to avoid garbled text in jsPDF.
 */
function formatAuditDetails(entry) {
  const parts = [];

  // Status transition - use ASCII arrow instead of unicode
  if (entry.old_status && entry.new_status) {
    parts.push(entry.old_status + ' -> ' + entry.new_status);
  } else if (entry.new_status) {
    parts.push(entry.new_status);
  }

  // Metadata
  if (entry.metadata && typeof entry.metadata === 'object') {
    const metaEntries = Object.entries(entry.metadata);
    for (const [key, value] of metaEntries) {
      if (value != null && value !== '') {
        parts.push(key + ': ' + value);
      }
    }
  }

  return parts.length > 0 ? parts.join('\n') : '-';
}

function renderAuditTrail(doc, logs, startY) {
  if (!logs || logs.length === 0) return startY;

  // Always start on a new page
  doc.addPage();
  let y = MARGIN + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...FOOTER_TEXT);
  doc.text('Audit Trail', MARGIN, y);
  y += 4;

  // Sort entries chronologically
  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(a.timestamp || 0);
    const dateB = new Date(b.timestamp || 0);
    return dateA - dateB;
  });

  const body = sortedLogs.map((entry) => [
    fmtDateTime(entry.timestamp),
    safe(entry.full_name),
    safe(entry.action),
    formatAuditDetails(entry),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Date/Time', 'User', 'Action', 'Details']],
    body: body,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: HEADER_TEXT,
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: HEADER_TEXT,
    },
    columnStyles: {
      0: { cellWidth: 30 },  // Date/Time
      1: { cellWidth: 30 },  // User
      2: { cellWidth: 35 },  // Action
      3: { cellWidth: 85 },  // Details
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2,
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return doc.lastAutoTable.finalY + 6;
}

// ── Footer and Page Management ────────────────────────────────────────────────

const WATERMARK_COLOUR = [229, 231, 235];

function renderFootersAndWatermarks(doc, config, instanceStatus) {
  const totalPages = doc.internal.getNumberOfPages();
  const timestamp = new Date().toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const showWatermark = instanceStatus === 'Draft' || instanceStatus === 'Open';

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Horizontal rule above footer
    const ruleY = PAGE_HEIGHT - MARGIN - 2;
    doc.setDrawColor(...FOOTER_TEXT);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, ruleY, PAGE_WIDTH - MARGIN, ruleY);

    // Footer text
    const footerY = PAGE_HEIGHT - MARGIN + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...FOOTER_TEXT);

    doc.text(safe(config.documentNumber), MARGIN, footerY);
    doc.text('Page ' + i + ' of ' + totalPages, PAGE_WIDTH / 2, footerY, { align: 'center' });
    doc.text(timestamp, PAGE_WIDTH - MARGIN, footerY, { align: 'right' });

    // DRAFT Watermark
    if (showWatermark) {
      const gState = new doc.GState({ opacity: 0.3 });
      doc.saveGraphicsState();
      doc.setGState(gState);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(70);
      doc.setTextColor(...WATERMARK_COLOUR);

      doc.text('DRAFT', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, {
        align: 'center',
        angle: 45,
      });

      doc.restoreGraphicsState();
    }
  }
}

// ── Main Builder ─────────────────────────────────────────────────────────────

function buildProfessionalPdf(data, config, logoBase64) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Render Document_Header
  let y = renderHeader(doc, data, config, logoBase64);

  // Render ITP metadata table (Contract, Work Area, Lot, etc.)
  y = renderMetadataTable(doc, data, config, y);

  // Inspection points table
  if (data.points && data.points.length > 0) {
    y = renderInspectionPointsTable(doc, data.points, y);
  }

  // Sign-off / Signature section
  y = renderSignatureSection(doc, data, y);

  // NCR summary section
  y = renderNCRSection(doc, data.ncrs, y);

  // Audit trail section (always on new page)
  y = renderAuditTrail(doc, data.logs, y);

  // Footer and page management (post-processing)
  renderFootersAndWatermarks(doc, config, data.instance.status);

  return Buffer.from(doc.output('arraybuffer'));
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  buildProfessionalPdf,
  renderHeader,
  renderMetadataTable,
  renderInspectionPointsTable,
  renderSignatureSection,
  renderNCRSection,
  renderAuditTrail,
  renderFootersAndWatermarks,
  calculateLogoDimensions,
  getTypeBadgeColour,
  formatSignOff,
  formatStatus,
  formatNCRResolution,
  formatAuditDetails,
  fmtDateTime,
  MARGIN,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  LOGO_MAX_WIDTH,
  LOGO_MAX_HEIGHT,
  HEADER_TEXT,
  FOOTER_TEXT,
  COLOUR_HP,
  COLOUR_WP,
  COLOUR_RP_SP_IP,
  COLOUR_APPROVED,
  COLOUR_REJECTED,
  ROW_ALT_BG,
  NCR_OPEN_BG,
  WATERMARK_COLOUR,
};
