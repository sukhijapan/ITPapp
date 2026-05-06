const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});
const NOTIFICATION_BUCKET = process.env.NOTIFICATION_BUCKET;

/**
 * Queue an NCR notification by writing a JSON file to S3.
 * A separate Lambda (outside VPC) picks it up and publishes to SNS.
 * Non-blocking — errors are logged but don't fail the caller.
 */
const notifyNCRCreated = async ({ ncrId, title, description, pointDescription, pointType, instanceId, itpName, projectName, lotNumber, panelNo, raisedBy }) => {
  if (!NOTIFICATION_BUCKET) {
    console.warn('[Notify] NOTIFICATION_BUCKET not set — skipping NCR notification');
    return;
  }

  const key = `ncr/${ncrId}-${Date.now()}.json`;
  const payload = {
    ncrId,
    title,
    description,
    pointDescription,
    pointType,
    instanceId,
    itpName,
    projectName,
    lotNumber: lotNumber || null,
    panelNo: panelNo || null,
    raisedBy,
    timestamp: new Date().toISOString(),
  };

  try {
    await s3.send(new PutObjectCommand({
      Bucket: NOTIFICATION_BUCKET,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    }));
    console.log(`[Notify] SUCCESS — Queued NCR notification: s3://${NOTIFICATION_BUCKET}/${key}`);
  } catch (err) {
    console.error(`[Notify] FAILED to write to S3 bucket=${NOTIFICATION_BUCKET} key=${key}:`, err.message, err.code || '');
  }
};

module.exports = { notifyNCRCreated };
