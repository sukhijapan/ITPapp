<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# Template Management

Templates define the structure of an ITP — the inspection points, their types, and their sequence. Every ITP is created from a template, so well-designed templates are the foundation of your quality management process.

## Understanding Templates

A template consists of:

- **Name** — Descriptive title (e.g., "Concrete Pour Inspection")
- **Description** — What this template covers
- **Project** — The project it belongs to (or global library)
- **Points** — An ordered list of inspection points, each with a type

## Point Types

Each point in a template has a type that determines its behavior when the ITP is executed:

| Type | Name | Purpose |
|------|------|---------|
| **HP** | Hold Point | Critical inspection that blocks all subsequent points until approved. Use for mandatory quality gates. |
| **WP** | Witness Point | Requires notification to stakeholders before sign-off. Stakeholders may attend or waive attendance. |
| **RP** | Review Point | Standard document or design review checkpoint. No blocking behavior. |
| **SP** | Sample Point | For recording test results, material samples, or lab reports. |
| **IP** | Inspection Point | General visual or physical inspection. No special behavior. |

## Creating a Template

### Steps

1. Navigate to the **Templates** section
2. Click **Create Template**
3. Fill in the template details:
   - **Name** — A clear, descriptive name
   - **Description** — What inspections this template covers
   - **Project** — Select the project this template belongs to
4. Click **Create**
5. The template is created — now add points to it

### Adding Points

1. Open the template you just created
2. Click **Add Point**
3. For each point, specify:
   - **Description** — What needs to be inspected (e.g., "Verify rebar spacing per drawing")
   - **Type** — Select HP, WP, RP, SP, or IP
   - **Sequence** — The order in which this point appears
4. Repeat for all inspection points
5. Points are saved automatically

### Tips for Point Design

- Place Hold Points (HP) at critical quality gates where work must stop for approval
- Use Witness Points (WP) when external parties should be notified but their absence shouldn't block progress indefinitely
- Order points to match the natural construction sequence
- Keep point descriptions specific and actionable

## Publishing to the Global Library

Templates can be shared across all projects by publishing them to the global library.

### Steps

1. Open the template you want to share
2. Click **Publish to Library**
3. The template is now available in the global library for all users to clone

### Important Notes

- Publishing creates a copy in the global library — the original template remains in your project
- Published templates cannot be edited in the library. To update, edit the original and re-publish
- Any user can clone a published template into their project

## Cloning a Template

You can create a copy of any template from the global library or within your project.

### Steps

1. Navigate to the **Templates** section or **Global Library**
2. Find the template you want to clone
3. Click **Clone**
4. The cloned template is created in your project with all points copied
5. Edit the clone as needed — it is independent of the original

### When to Clone

- Starting a new project with similar inspection requirements
- Customizing a standard template for specific site conditions
- Creating variations of an existing template (e.g., different concrete grades)

## Deleting a Template

### Steps

1. Open the template you want to delete
2. Click **Delete**
3. Confirm the deletion

### Important Notes

- You cannot delete a template that has been used to create ITP instances
- Deleting a template does not affect ITPs already created from it
- Deleted templates cannot be recovered

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Create template | ✓ | ✓ | ✗ | ✓ |
| Edit template | ✓ | ✓ | ✗ | ✓ |
| Delete template | ✓ | ✓ | ✗ | ✓ |
| Publish to library | ✓ | ✓ | ✗ | ✓ |
| Clone from library | ✓ | ✓ | ✓ | ✓ |
| View templates | ✓ | ✓ | ✓ | ✓ |

## Tips & Common Questions

**Q: How many points can a template have?**  
A: There is no hard limit, but templates typically have 5–30 points. Very long templates may be better split into multiple ITPs.

**Q: Can I change a template after creating ITPs from it?**  
A: Yes, but changes only affect future ITPs. Existing ITPs retain the point structure from when they were created.

**Q: What's the difference between project templates and library templates?**  
A: Project templates belong to a specific project and are only visible within that project. Library templates are published globally and can be cloned into any project.

**Q: Can I import templates from a spreadsheet?**  
A: Not currently. Templates must be created manually through the application interface.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)
