const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// v2 — supports email/ prefix for onboarding emails (invitations, password resets)
const s3 = new S3Client({});
const ses = new SESClient({ region: process.env.AWS_SES_REGION || 'ap-southeast-2' });
const FROM_EMAIL = process.env.SES_FROM_EMAIL;
const TO_EMAIL = process.env.SES_TO_EMAIL;
const FRONTEND_URL = process.env.FRONTEND_URL || '';

const esc = (s) => (s || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const row = (label, value) =>
  `<tr><td style="padding:8px 12px;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f1f5f9">${label}</td><td style="padding:8px 12px;color:#1e293b;font-size:13px;border-bottom:1px solid #f1f5f9">${value}</td></tr>`;

exports.handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    console.log(`[Notifier] Processing s3://${bucket}/${key}`);

    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = await obj.Body.transformToString();
      const data = JSON.parse(body);

      // Generic email (invitation, password reset, etc.)
      if (key.startsWith('email/')) {
        console.log(`[Notifier] Sending ${data.type || 'generic'} email to ${data.to}`);
        await ses.send(new SendEmailCommand({
          Source: FROM_EMAIL,
          Destination: { ToAddresses: [data.to] },
          Message: {
            Subject: { Data: data.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: data.html, Charset: 'UTF-8' },
              Text: { Data: data.text, Charset: 'UTF-8' },
            },
          },
        }));
        console.log(`[Notifier] SUCCESS — ${data.type || 'generic'} email sent to ${data.to}`);
        continue;
      }

      // Witness Point notifications (notify, reschedule, waiver, cancel)
      if (key.startsWith('wp-notification/')) {
        const recipient = data.to;
        if (!recipient) {
          console.error(`[Notifier] wp-notification missing 'to' field in ${key}`);
          continue;
        }
        console.log(`[Notifier] Sending WP ${data.type || 'notification'} email to ${recipient}`);
        await ses.send(new SendEmailCommand({
          Source: FROM_EMAIL,
          Destination: { ToAddresses: [recipient] },
          Message: {
            Subject: { Data: data.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: data.html, Charset: 'UTF-8' },
              Text: { Data: data.text || data.subject, Charset: 'UTF-8' },
            },
          },
        }));
        console.log(`[Notifier] SUCCESS — WP email sent to ${recipient}`);
        continue;
      }

      const ncrRef = `NCR-${String(data.ncrId).padStart(4, '0')}`;
      const ncrUrl = FRONTEND_URL ? `${FRONTEND_URL}/ncrs/${data.ncrId}` : '';
      const itpUrl = FRONTEND_URL && data.instanceId ? `${FRONTEND_URL}/itp/${data.instanceId}` : '';
      const ts = data.timestamp ? new Date(data.timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Adelaide' }) : '-';

      const subject = `[NCR Raised] ${ncrRef} — ${(data.title || 'New NCR').substring(0, 70)}`;

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

  <tr><td style="background:#dc2626;padding:20px 24px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="color:#ffffff;font-size:20px;font-weight:bold">&#9888;&#65039; Non-Conformance Report Raised</td></tr>
      <tr><td style="color:#fecaca;font-size:13px;padding-top:4px">${esc(data.raisedBy)} raised ${ncrRef} on ${ts}</td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:20px 24px 12px;border-bottom:1px solid #e2e8f0">
    <span style="display:inline-block;background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px">${ncrRef}</span>
    <span style="display:inline-block;background:#fef2f2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:6px">Open</span>
    <h2 style="margin:8px 0 0;font-size:18px;color:#1e293b">${esc(data.title)}</h2>
  </td></tr>

  <tr><td style="padding:16px 24px 4px">
    <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#2563eb">NCR Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
      ${row('NCR Reference', `<strong>${ncrRef}</strong>`)}
      ${row('NCR Title', esc(data.title))}
      ${row('Status', '<span style="background:#fef2f2;color:#991b1b;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600">Open</span>')}
      ${row('Date Raised', ts)}
      ${row('Raised By', esc(data.raisedBy))}
    </table>
  </td></tr>

  <tr><td style="padding:16px 24px 4px">
    <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#2563eb">Description</h3>
    <div style="background:#f8fafc;border-left:4px solid #2563eb;padding:12px 16px;border-radius:0 6px 6px 0;font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap">${esc(data.description)}</div>
  </td></tr>

  <tr><td style="padding:16px 24px 4px">
    <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#2563eb">Project &amp; ITP Context</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
      ${row('Project', esc(data.projectName))}
      ${row('ITP', itpUrl ? `<a href="${itpUrl}" style="color:#2563eb;text-decoration:none">${esc(data.itpName)}</a>` : esc(data.itpName))}
      ${row('Inspection Point', `<span style="background:#991b1b;color:#fff;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700">${esc(data.pointType)}</span> ${esc(data.pointDescription)}`)}
      ${data.lotNumber ? row('Lot', esc(data.lotNumber)) : ''}
      ${data.panelNo ? row('Panel', esc(data.panelNo)) : ''}
    </table>
  </td></tr>

  <tr><td style="padding:24px;text-align:center">
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;font-size:13px;color:#92400e;margin-bottom:16px">
      &#9203; This NCR requires attention. The inspection point cannot be approved until this NCR is resolved.
    </div>
    ${ncrUrl ? `<a href="${ncrUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none">View NCR Details</a>` : ''}
  </td></tr>

  <tr><td style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#94a3b8">This is an automated notification from the ITP Management System. Do not reply to this email.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

      const plainText = [
        `NON-CONFORMANCE REPORT RAISED`,
        ``,
        `${data.raisedBy || 'A user'} has raised ${ncrRef}.`,
        ``,
        `NCR Title: ${data.title || '-'}`,
        `Project: ${data.projectName || '-'}`,
        `ITP: ${data.itpName || '-'}`,
        `Point: ${data.pointType || ''} - ${data.pointDescription || '-'}`,
        `Date: ${ts}`,
        ``,
        `Description:`,
        data.description || '-',
        ``,
        ncrUrl ? `View NCR: ${ncrUrl}` : '',
      ].join('\n');

      console.log(`[Notifier] Sending email via SES from=${FROM_EMAIL} to=${TO_EMAIL} region=${process.env.AWS_SES_REGION || 'ap-southeast-2'}`);

      await ses.send(new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [TO_EMAIL] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            Text: { Data: plainText, Charset: 'UTF-8' },
          },
        },
      }));

      console.log(`[Notifier] SUCCESS — HTML email sent for ${ncrRef} to ${TO_EMAIL}`);
    } catch (err) {
      console.error(`[Notifier] FAILED to process ${key}:`, err.name, err.message, err.$metadata?.httpStatusCode || '');
    }
  }
};
