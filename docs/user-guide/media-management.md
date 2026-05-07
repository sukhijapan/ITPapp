<!-- 
  Last Updated: 2025-07-06
  Covers: v1.0 of the application
-->

# Media Management

Media attachments provide photographic evidence for inspections, NCRs, and sign-offs. The system supports photo uploads with automatic GPS coordinate capture, ensuring a verifiable record of where and when evidence was collected.

## Understanding Media in the System

Media files (photos) can be attached to:

- **ITP instances** — General evidence for the overall inspection plan
- **ITP points** — Specific evidence for individual inspection points
- **NCRs** — Evidence of defects or corrective actions

## Uploading Photos

### Steps

1. Navigate to the ITP, point, or NCR where you want to attach evidence
2. Click **Upload** or the camera/attachment icon
3. Select a photo from your device
4. If your device has GPS enabled, coordinates are automatically captured
5. The photo uploads and appears in the attachments section

### GPS Coordinates

When uploading from a mobile device with location services enabled:

- **Latitude** and **longitude** are automatically recorded with the photo
- GPS data provides verifiable proof of where the photo was taken
- Coordinates are stored with the media record and displayed in the attachment details
- If GPS is not available, the photo uploads without coordinates

### Upload Details

- Photos are uploaded directly to cloud storage (S3) using a presigned URL for performance
- The system generates a secure upload link, your browser uploads directly to storage
- Metadata (filename, GPS coordinates, association) is stored in the database
- Supported formats: JPEG, PNG, and other common image formats

## Viewing Attachments

### On an ITP

1. Open the ITP instance
2. Scroll to the **Attachments** section or navigate to a specific point
3. Click any thumbnail to view the full-size image
4. GPS coordinates (if available) are shown in the attachment details

### On an NCR

1. Open the NCR
2. Attachments are displayed alongside the NCR description and resolution

## Deletion Protection After Sign-Off

Once an ITP point has been signed off, media attached to that point is protected:

- **Before sign-off** — Media can be deleted by the uploader or authorized roles
- **After sign-off** — Media **cannot be deleted**. This ensures the evidence record is preserved for audit purposes

This protection applies to:
- Photos attached directly to a signed-off point
- Photos attached to the ITP instance after the ITP is closed

## Deleting Media

### Steps (Before Sign-Off Only)

1. Navigate to the attachment you want to remove
2. Click **Delete** on the media item
3. Confirm the deletion
4. The file is removed from storage and the database

### When Deletion is Blocked

If you see a message that media cannot be deleted:
- The associated point has already been signed off, OR
- The ITP has been closed
- This is by design to maintain audit integrity

## Role-Specific Notes

| Action | Subcontractor | Head Contractor | Client | Admin |
|--------|:---:|:---:|:---:|:---:|
| Upload media | ✓ | ✓ | ✗ | ✓ |
| View media | ✓ | ✓ | ✓ | ✓ |
| Delete media (before sign-off) | ✓ | ✓ | ✗ | ✓ |
| Delete media (after sign-off) | ✗ | ✗ | ✗ | ✗ |

## Tips & Common Questions

**Q: What file size limit applies to uploads?**  
A: Individual files are limited by the presigned URL configuration. Large files (over 10 MB) may take longer to upload on slow connections.

**Q: Can I upload multiple photos at once?**  
A: Upload one photo at a time. Each upload captures its own GPS coordinates.

**Q: Why don't my photos have GPS coordinates?**  
A: Ensure location services are enabled on your device and that you've granted the browser permission to access your location. Desktop uploads typically don't include GPS data.

**Q: Can I replace a photo after uploading?**  
A: No. Delete the existing photo (if the point hasn't been signed off) and upload a new one.

**Q: What happens to media if an ITP is deactivated?**  
A: Media remains in storage and the database. Deactivation does not delete associated files.

**Q: Are photos included in the PDF report?**  
A: Yes. When a PDF report is generated, attached media is included as evidence in the report.

---

[← Back to User Guide](./README.md) · [Back to Documentation Index](../README.md)
