<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# NCR Management

Non-Conformance Reports (NCRs) document defects or deviations from specifications found during inspections. NCRs are linked to specific ITP points and must be resolved before the associated point can be signed off.

## Understanding the NCR Lifecycle

Every NCR follows this workflow:

```
Open → Resolved → Verified → Closed
```

| Status | Meaning |
|--------|---------|
| **Open** | Defect identified and documented, awaiting corrective action |
| **Resolved** | Corrective action has been taken, awaiting verification |
| **Verified** | Resolution has been verified as acceptable |
| **Closed** | NCR is complete — no further action required |

## How NCRs Block Point Approval

This is a critical concept:

- When an NCR is **Open** or **Resolved** (but not yet Verified/Closed), the associated ITP point **cannot be signed off**
- The point remains blocked until the NCR reaches **Verified** or **Closed** status
- This ensures defects are properly addressed before quality sign-off proceeds

## Raising an NCR

### Steps

1. Open the ITP containing the point with the defect
2. Navigate to the specific point
3. Click **Raise NCR**
4. Fill in the NCR details:
   - **Title** — Brief description of the non-conformance
   - **Description** — Detailed explanation of what was found
   - **Severity** — How serious the defect is
   - **Root cause** — What caused the non-conformance (if known)
   - **Corrective action** — Proposed fix or remediation
5. Attach supporting evidence (photos, documents) if available
6. Click **Submit**

### Expected Outcome

- A new NCR is created in **Open** status
- The associated ITP point is now blocked from sign-off
- All project stakeholders can view the NCR

## Resolving an NCR

Once corrective action has been taken:

### Steps

1. Navigate to the NCR (from the ITP point or NCR list)
2. Click **Resolve**
3. Document the corrective action taken:
   - **Resolution description** — What was done to fix the issue
   - **Evidence** — Photos or documents proving the fix (recommended)
4. Click **Submit Resolution**

### Expected Outcome

- The NCR moves to **Resolved** status
- The associated point is still blocked (awaiting verification)
- The NCR is ready for verification by an authorized reviewer

## Verifying an NCR

Verification confirms that the corrective action is acceptable:

### Steps

1. Open the resolved NCR
2. Review the resolution description and evidence
3. If acceptable, click **Verify**
4. If not acceptable, update the NCR with feedback and it returns to Open

### Expected Outcome

- The NCR moves to **Verified** → **Closed** status
- The associated ITP point is unblocked and can now be signed off

## Viewing NCRs

### By ITP Point

1. Open an ITP
2. Navigate to a specific point
3. Any NCRs raised against that point are displayed with their current status

### NCR List

1. Navigate to the **NCRs** section
2. View all NCRs across the project
3. Filter by status (Open, Resolved, Verified, Closed)

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Raise NCR | ✓ | ✓ | ✗ | ✓ |
| View NCRs | ✓ | ✓ | ✓ | ✓ |
| Resolve NCR | ✓ | ✓ | ✗ | ✓ |
| Verify NCR | ✗ | ✓ | ✓ | ✓ |
| Update NCR details | ✓ | ✓ | ✗ | ✓ |

## Tips & Common Questions

**Q: Can I raise multiple NCRs against the same point?**  
A: Yes. A point can have multiple NCRs. All must be resolved and verified before the point can be signed off.

**Q: Can I delete an NCR?**  
A: No. NCRs are permanent records for audit purposes. If an NCR was raised in error, resolve it with a note explaining it was raised incorrectly.

**Q: Who gets notified when an NCR is raised?**  
A: All project members with access to the ITP can see the NCR. Email notifications depend on project configuration.

**Q: What if the corrective action doesn't fix the problem?**  
A: The verifier can reject the resolution, which effectively keeps the NCR in a state requiring further action. A new resolution can then be submitted.

**Q: Does closing an NCR automatically sign off the point?**  
A: No. Closing the NCR unblocks the point, but someone must still manually sign off the point.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)
