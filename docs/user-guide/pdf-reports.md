<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# PDF Reports

The system generates professional PDF reports for completed ITPs. Reports include all inspection details, sign-off records, attached evidence, and project branding. They serve as the official quality record for handover and compliance purposes.

## How PDF Reports Work

PDF reports can be generated in two ways:

1. **Automatically** — When an ITP reaches Closed status, a report is generated automatically
2. **On-demand** — You can manually generate a report for any ITP at any time

## Auto-Generation on ITP Closure

When all points in an ITP are approved and the ITP is closed:

1. The system automatically generates a PDF report
2. The report is stored and linked to the ITP
3. No manual action is required
4. The report is immediately available for download

### What Triggers Auto-Generation

- All ITP points reach **Approved** status
- The ITP transitions to **Closed** status
- The PDF is generated within seconds of closure

## On-Demand Export

You can generate a report at any time, regardless of ITP status.

### Steps

1. Open the ITP you want to export
2. Click **Generate Report** or **Export PDF**
3. The system generates the report
4. The PDF downloads automatically or is available in the reports section

### When to Use On-Demand Export

- Progress reports during active inspections
- Interim reports for client meetings
- Re-generating a report after branding changes
- Exporting a report for an ITP that was closed before the auto-generation feature was available

## Report Contents

A generated PDF report includes:

| Section | Contents |
|---------|----------|
| **Cover page** | Project name, ITP title, document number, date, company branding |
| **ITP details** | Lot number, drawing reference, location, status, dates |
| **Point summary** | Table of all points with type, description, status, sign-off date |
| **Point details** | Each point with full sign-off information and approver details |
| **Media evidence** | Attached photos with GPS coordinates (if available) |
| **NCR summary** | Any NCRs raised, their resolution, and verification status |
| **Sign-off record** | Who signed off each point and when |
| **External approvals** | External sign-off records with name, company, and date |

## Report Branding

Reports use the branding configured in your project settings:

| Element | Source |
|---------|--------|
| **Logo** | Uploaded via Project Settings → Logo |
| **Company name** | Configured in Project Settings → Report Configuration |
| **Document prefix** | Configured in Project Settings → Report Configuration |
| **Document number** | Auto-generated: `{prefix}-{ITP number}` |

### Example Document Number

If your prefix is `8D91-ITP` and the ITP number is `512`:
- Document number: `8D91-ITP-512`

### Configuring Branding

See [Project Management → Report Branding Configuration](./project-management.md#report-branding-configuration) for setup instructions.

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| View/download reports | ✓ | ✓ | ✓ | ✓ |
| Generate on-demand report | ✓ | ✓ | ✓ | ✓ |
| Configure report branding | ✗ | ✓ | ✗ | ✓ |

## Tips & Common Questions

**Q: Can I customize what appears in the report?**  
A: The report format is standardized. You can customize branding (logo, company name, prefix) but not the report structure or sections.

**Q: What format is the report?**  
A: Reports are generated as PDF files, suitable for printing, emailing, or archiving.

**Q: How large are the PDF files?**  
A: Size depends on the number of points and attached photos. A typical ITP with 10-20 points and several photos produces a 2-5 MB PDF.

**Q: Can I regenerate a report?**  
A: Yes. Use the on-demand export to generate a fresh report at any time. This is useful if branding was updated after the original report was created.

**Q: Are reports stored permanently?**  
A: Yes. Generated reports are stored in the system and can be downloaded at any time.

**Q: What if my project doesn't have branding configured?**  
A: Reports will generate without a logo and with default text. Configure branding in project settings for professional-looking reports.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)
