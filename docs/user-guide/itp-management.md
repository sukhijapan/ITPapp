<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# ITP Management

Inspection and Test Plans (ITPs) are the core documents in the quality management process. An ITP defines a series of inspection points that must be completed and approved before work can proceed. This section covers creating, executing, and closing ITPs.

## Understanding the ITP Lifecycle

Every ITP follows this workflow:

```
Draft → Open → Pending Review → Approved/Rejected → Closed
```

| Status | Meaning |
|--------|---------|
| **Draft** | ITP created but not yet submitted for execution |
| **Open** | ITP is active — points can be signed off |
| **Pending Review** | All points approved, awaiting final ITP-level approval |
| **Approved** | Head Contractor or Client has approved the ITP |
| **Rejected** | Head Contractor or Client has rejected the ITP (returns to Open) |
| **Closed** | ITP is complete — no further changes allowed |

## Creating an ITP from a Template

ITPs are always created from templates. You cannot create an ITP from scratch.

### Steps

1. Navigate to the **ITPs** section
2. Click **Create ITP**
3. Select a **template** from the list (project templates or global library)
4. Fill in the ITP details:
   - **Project** — The project this ITP belongs to
   - **Lot number** — The lot or area reference
   - **Drawing reference** — Related drawing number (optional)
   - **Location** — Where the work is being performed (optional)
5. Click **Create**
6. The ITP is created in **Draft** status with all points from the template

### Expected Outcome

A new ITP appears in your ITP list with Draft status. All inspection points from the template are copied into the ITP, maintaining their sequence order and types.

## Submitting an ITP (Draft → Open)

Once you've reviewed the ITP details and are ready to begin inspections:

1. Open the ITP from your list
2. Review the points and details
3. Click **Submit**
4. The ITP moves to **Open** status

Once Open, inspection points can be signed off.

## Signing Off Points

Point sign-off is how inspections are recorded. Each point requires approval from authorized roles.

### Steps

1. Open an ITP in **Open** status
2. Navigate to the point you want to sign off
3. Review any attached media or NCRs
4. Click **Sign Off** on the point
5. The point status changes to **Approved**

### Point Types and Their Behavior

| Type | Name | Behavior |
|------|------|----------|
| **HP** | Hold Point | Blocks progress — must be approved in sequence before subsequent points can be signed off |
| **WP** | Witness Point | Requires notification to stakeholders before sign-off (see [Witness Points](./witness-points.md)) |
| **RP** | Review Point | Standard review — no blocking behavior |
| **SP** | Sample Point | For recording sample/test results |
| **IP** | Inspection Point | General inspection checkpoint |

### Hold Point (HP) Blocking

Hold Points enforce sequential approval:

- An HP must be approved before any points after it (in sequence order) can be signed off
- If an HP is at position 3, points 4, 5, 6, etc. are blocked until point 3 is approved
- Points before the HP are not affected
- This ensures critical inspections cannot be skipped

### NCR Blocking

If a point has an open (unresolved) NCR:

- The point **cannot** be signed off until the NCR is resolved and verified
- Resolve the NCR first, then sign off the point
- See [NCR Management](./ncr-management.md) for details

## Auto-Close Behavior

When all points in an ITP are approved:

- The ITP automatically moves to **Closed** status
- A PDF report is automatically generated (see [PDF Reports](./pdf-reports.md))
- No manual action is required to close the ITP

## ITP Approval and Rejection

After all points are signed off, the ITP moves to Pending Review:

- **Approve** — Head Contractor or Client approves the ITP, moving it to Approved/Closed
- **Reject** — Head Contractor or Client rejects the ITP, returning it to Open status for rework

## Deactivating an ITP

If an ITP is no longer needed:

1. Open the ITP
2. Click **Deactivate**
3. The ITP is marked as inactive and removed from active lists

Deactivated ITPs are not deleted — they remain in the system for audit purposes.

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Create ITP | ✓ | ✓ | ✗ | ✓ |
| Submit ITP (Draft → Open) | ✓ | ✓ | ✗ | ✓ |
| Sign off points | ✓ | ✓ | ✓ | ✓ |
| Approve/Reject ITP | ✗ | ✓ | ✓ | ✓ |
| Deactivate ITP | ✗ | ✓ | ✗ | ✓ |
| Delete ITP | ✗ | ✗ | ✗ | ✓ |
| View ITPs | ✓ | ✓ | ✓ | ✓ |

## Tips & Common Questions

**Q: Can I edit an ITP after submitting it?**  
A: No. Once an ITP is in Open status, you cannot change its structure. You can only sign off points, attach media, and raise NCRs.

**Q: What happens if I reject an ITP?**  
A: It returns to Open status. Points that were already signed off retain their status, but additional work may be needed.

**Q: Can I reorder points after creating an ITP?**  
A: No. Point order is set by the template. If you need a different order, create a new template.

**Q: Why can't I sign off a point?**  
A: Check for: (1) a Hold Point earlier in the sequence that hasn't been approved, (2) an open NCR on the point, or (3) insufficient role permissions.

**Q: What triggers the PDF report?**  
A: The report is automatically generated when the ITP reaches Closed status. You can also generate it on-demand from an approved ITP.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)
