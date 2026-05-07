<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# Project Management

Projects are the top-level organizational unit in the system. All ITPs, templates, NCRs, and users are associated with a project. This section covers creating projects, viewing dashboard statistics, and configuring report branding.

## Understanding Projects

A project represents a construction project or site. It contains:

- **ITPs** — All inspection and test plans for the project
- **Templates** — ITP templates specific to this project
- **NCRs** — Non-conformance reports raised within the project
- **Users** — Team members assigned to the project
- **Configuration** — Report branding, witness point settings

## Creating a Project

### Steps

1. Navigate to the **Projects** section
2. Click **Create Project**
3. Fill in the project details:
   - **Name** — The project name (e.g., "Bolivar WWTP Inlet Structure")
   - **Description** — Brief description of the project scope
   - **Location** — Project site location (optional)
4. Click **Create**

### Expected Outcome

- A new project appears in your project list
- You can now create templates, ITPs, and invite users to this project

## Dashboard Statistics

The project dashboard provides an at-a-glance overview of quality status.

### Available Statistics

| Metric | Description |
|--------|-------------|
| **Total ITPs** | Number of ITP instances in the project |
| **Open ITPs** | ITPs currently in progress |
| **Closed ITPs** | Completed ITPs |
| **Total Points** | Total inspection points across all ITPs |
| **Approved Points** | Points that have been signed off |
| **Open NCRs** | Unresolved non-conformance reports |
| **Completion Rate** | Percentage of points approved vs total |

### Viewing the Dashboard

1. Navigate to the **Projects** section
2. Select a project
3. The dashboard displays automatically with current statistics
4. Statistics update in real-time as ITPs progress

## Report Branding Configuration

Customize how PDF reports look for your project by configuring branding elements.

### Steps

1. Open the project
2. Navigate to **Settings** or **Report Configuration**
3. Configure the branding elements:
   - **Company name** — Displayed in the report header
   - **Document prefix** — Prefix for report document numbers (e.g., "8D91-ITP")
   - **Logo** — Upload your company logo for report headers
4. Click **Save**

### Logo Upload

1. In the report configuration section, click **Upload Logo**
2. Select an image file (PNG or JPEG recommended)
3. The logo is stored and will appear on all PDF reports for this project
4. You can replace or delete the logo at any time

### How Branding Appears in Reports

- **Header** — Company logo (left), company name (right), document prefix + ITP number
- **Footer** — Project name, page numbers
- **Cover page** — Full branding with project details

See [PDF Reports](./pdf-reports.md) for more details on report generation.

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Create project | ✗ | ✓ | ✗ | ✓ |
| View project | ✓ | ✓ | ✓ | ✓ |
| View dashboard stats | ✓ | ✓ | ✓ | ✓ |
| Configure report branding | ✗ | ✓ | ✗ | ✓ |
| Upload/delete logo | ✗ | ✓ | ✗ | ✓ |
| Edit project details | ✗ | ✓ | ✗ | ✓ |

## Tips & Common Questions

**Q: Can a user belong to multiple projects?**  
A: Yes. Users can be assigned to multiple projects and switch between them.

**Q: Can I archive a completed project?**  
A: Projects remain in the system indefinitely. Completed projects with all ITPs closed are effectively archived by their status.

**Q: Who can see project statistics?**  
A: All users assigned to the project can view the dashboard. The statistics shown are the same for all roles.

**Q: Does changing the report branding affect existing reports?**  
A: No. Previously generated PDF reports retain the branding from when they were created. Only new reports use the updated branding.

**Q: Can I delete a project?**  
A: Projects cannot be deleted once they contain ITPs or other data. This preserves the audit trail.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)
