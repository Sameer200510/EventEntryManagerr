const { Resend } = require("resend");
const nodemailer = require("nodemailer");
const prisma = require("../prismaClient");
const { decryptJSON } = require("./crypto");

const BULK_BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1500;

const DRIVE_LINK =
  "https://drive.google.com/file/d/1Ub73iPyrnTLPUwytr4GQV311u-7emDjd/view?usp=sharing";

let cachedProvider = null;
let providerInstance = null;

const getProvider = async () => {
  const provider = await prisma.emailProvider.findFirst({
    where: { isActive: true },
  });

  if (!provider) {
    throw new Error("No active email provider configured.");
  }

  if (cachedProvider && cachedProvider.id === provider.id && cachedProvider.updatedAt.getTime() === provider.updatedAt.getTime()) {
    return { provider: cachedProvider, instance: providerInstance };
  }

  const credentials = decryptJSON(provider.credentials);
  let instance = null;

  if (provider.name === "RESEND") {
    instance = new Resend(credentials.apiKey);
  } else if (provider.name === "GOOGLE") {
    instance = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: provider.senderEmail,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken,
      },
    });
  } else if (provider.name === "AWS_SES") {
    instance = nodemailer.createTransport({
      host: `email-smtp.${credentials.region}.amazonaws.com`,
      port: 465,
      secure: true,
      auth: {
        user: credentials.accessKey,
        pass: credentials.secretKey,
      },
    });
  } else if (provider.name === "SMTP") {
    instance = nodemailer.createTransport({
      host: credentials.host,
      port: Number(credentials.port),
      secure: Number(credentials.port) === 465,
      auth: {
        user: credentials.username,
        pass: credentials.password,
      },
    });
  }

  cachedProvider = provider;
  providerInstance = instance;

  return { provider, instance };
};

const sendQrEmail = async (attendee, event, qrCodeDataUrl, customMessage = "", template = null, trackingId = null) => {
  try {
    if (!attendee.email) {
      console.log(`[SKIP_EMAIL] ${attendee.roll} has no email`);
      return { success: false, email: attendee.email };
    }

    const { provider, instance } = await getProvider();

    const messageHtml = customMessage ? `
      <div style="background:#EEF2FF; padding:18px; border-radius:14px; margin-bottom:24px; border-left:5px solid #4F46E5; color:#3730A3; font-size:15px; line-height:1.7; white-space:pre-wrap; word-break:break-word;">
        ${customMessage}
      </div>
    ` : "";

    let htmlContent = "";
    
    // Server base URL for tracking pixel
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001";
    const trackingPixel = trackingId ? `<img src="${BACKEND_URL}/api/campaigns/track/${trackingId}" width="1" height="1" style="display:none;" />` : "";

    if (template) {
      htmlContent = template.htmlBody
        .replace(/{{name}}/g, attendee.name || "")
        .replace(/{{event_name}}/g, event.name || "")
        .replace(/{{event_type}}/g, event.type || "")
        .replace(/{{event_date}}/g, new Date(event.date).toLocaleDateString())
        .replace(/{{event_venue}}/g, event.venue || "")
        .replace(/{{qr_code}}/g, `<img src="cid:qrcode" alt="QR Code" style="width:240px; height:240px;" />`)
        .replace(/{{qr_link}}/g, attendee.qrLink || "");
        
      htmlContent += trackingPixel;
    } else {
      htmlContent = `
        <div style="font-family:Arial,sans-serif; text-align:center; padding: 20px;">
          ${messageHtml || `<p style="font-size: 16px;">Here is your Entry Pass for <strong>${event.name}</strong></p>`}
          <div style="margin: 20px 0;">
            <img src="cid:qrcode" alt="QR Code" style="width:240px; height:240px; display:inline-block;" />
          </div>
          <p style="font-size: 14px; color: #666;">Scan this QR code at the entry gate.</p>
          <p style="font-size: 12px; margin-top: 30px;"><a href="${attendee.qrLink}">View Pass Online</a></p>
        </div>
        ${trackingPixel}
      `;
    }

    let response;
    
    if (provider.name === "RESEND") {
      const res = await instance.emails.send({
        from: provider.senderEmail,
        to: attendee.email,
        subject: template ? template.subject : `Your ${event.type} Entry QR Code`,
        html: htmlContent,
        attachments: [
          {
            filename: 'qrcode.png',
            content: Buffer.from(qrCodeDataUrl.split(',')[1], 'base64'),
            content_id: 'qrcode',
            content_type: 'image/png',
            disposition: 'inline',
          },
        ],
      });
      
      if (res.error) {
        throw new Error(res.error.message || JSON.stringify(res.error));
      }
      response = res.data;
    } else {
      response = await instance.sendMail({
        from: provider.senderEmail,
        to: attendee.email,
        subject: template ? template.subject : `Your ${event.type} Entry QR Code`,
        html: htmlContent,
        attachments: [
          {
            filename: 'qrcode.png',
            content: Buffer.from(qrCodeDataUrl.split(',')[1], 'base64'),
            cid: 'qrcode',
            contentType: 'image/png',
            contentDisposition: 'inline',
          },
        ],
      });
    }

    console.log(`[EMAIL_SENT] ${attendee.email}`);

    return {
      success: true,
      email: attendee.email,
      response,
    };
  } catch (error) {
    console.error(`[EMAIL_FAILED] ${attendee.email}`, error.message);

    return {
      success: false,
      email: attendee.email,
      error: error.message,
    };
  }
};

const sendBulkQrEmails = async (
  attendees,
  qrGeneratorFunction,
  customMessage = "",
) => {
  const results = [];

  console.log(`Starting bulk email sending to ${attendees.length} attendees`);

  for (let i = 0; i < attendees.length; i += BULK_BATCH_SIZE) {
    const batch = attendees.slice(i, i + BULK_BATCH_SIZE);

    console.log(`Processing batch ${Math.floor(i / BULK_BATCH_SIZE) + 1}`);

    const batchResults = await Promise.all(
      batch.map(async (attendee) => {
        try {
          const qrCodeDataUrl = await qrGeneratorFunction(attendee);
          return await sendQrEmail(attendee, qrCodeDataUrl, customMessage);
        } catch (err) {
          console.error(
            `[QR_GENERATION_FAILED] ${attendee.email}`,
            err.message,
          );

          return {
            success: false,
            email: attendee.email,
            error: err.message,
          };
        }
      }),
    );

    results.push(...batchResults);

    if (i + BULK_BATCH_SIZE < attendees.length) {
      console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`
========================================
BULK EMAIL COMPLETED
========================================
`);

  return results;
};

module.exports = {
  sendQrEmail,
  sendBulkQrEmails,
  getProvider
};