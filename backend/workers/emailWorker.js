const prisma = require("../prismaClient");
const { getProvider, sendQrEmail } = require("../utils/email");
const QRCode = require("qrcode");

let isRunning = false;
let workerTimer = null;

const WORKER_INTERVAL_MS = 2000;

// Provider specific overrides for rate limits (Delay per batch)
const getProviderDelay = (provider, batchSize, requestedDelay) => {
  if (provider.name === "GOOGLE") {
    // Max 10 per sec, let's do 1.5s per email to be very safe
    return Math.max(requestedDelay, batchSize * 1500); 
  }
  if (provider.name === "AWS_SES") {
    // SES is typically 14/sec. Let's do 100ms per email to be safe.
    return Math.max(requestedDelay, batchSize * 100);
  }
  if (provider.name === "RESEND") {
    // Resend free tier allows 2 requests per second. Let's do 550ms per email.
    return Math.max(requestedDelay, batchSize * 550);
  }
  return requestedDelay; 
};

const processQueue = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    // Promote SCHEDULED campaigns if their time has arrived
    await prisma.emailCampaign.updateMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() }
      },
      data: { status: "RUNNING" }
    });

    const activeCampaign = await prisma.emailCampaign.findFirst({
      where: { status: "RUNNING" },
      include: { event: true, template: true }
    });

    if (!activeCampaign) {
      isRunning = false;
      return;
    }

    // Find up to batchSize jobs
    const jobs = await prisma.emailJob.findMany({
      where: {
        campaignId: activeCampaign.id,
        status: { in: ["PENDING", "FAILED"] },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } }
        ]
      },
      take: activeCampaign.batchSize,
      include: { attendee: true }
    });

    if (jobs.length === 0) {
      // Check if all jobs are done
      const pendingCount = await prisma.emailJob.count({
        where: { campaignId: activeCampaign.id, status: { in: ["PENDING", "FAILED", "PROCESSING"] } }
      });
      if (pendingCount === 0) {
        await prisma.emailCampaign.update({
          where: { id: activeCampaign.id },
          data: { status: "COMPLETED", pendingCount: 0 }
        });
      }
      isRunning = false;
      return;
    }

    // Mark as PROCESSING
    await prisma.emailJob.updateMany({
      where: { id: { in: jobs.map(j => j.id) } },
      data: { status: "PROCESSING" }
    });

    let successCount = 0;
    let failCount = 0;

    for (const job of jobs) {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(job.attendee.qrLink);
        const result = await sendQrEmail(job.attendee, activeCampaign.event, qrCodeDataUrl, "", activeCampaign.template, job.trackingId);
        
        if (result.success) {
          await prisma.emailJob.update({
            where: { id: job.id },
            data: { status: "SENT" }
          });
          successCount++;
        } else {
          throw new Error(result.error || "Unknown Error");
        }
      } catch (err) {
        const isPermanent = err.message.includes("Invalid Address") || job.retries >= job.maxRetries;
        await prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: isPermanent ? "PERM_FAILED" : "FAILED",
            errorMessage: err.message,
            retries: { increment: 1 },
            nextRetryAt: isPermanent ? null : new Date(Date.now() + 60000) // Retry in 1 min
          }
        });
        failCount++;
      }
    }

    // Calculate absolute stats for perfect accuracy
    const sentCount = await prisma.emailJob.count({ where: { campaignId: activeCampaign.id, status: "SENT" } });
    const failedCount = await prisma.emailJob.count({ where: { campaignId: activeCampaign.id, status: { in: ["FAILED", "PERM_FAILED"] } } });
    const pendingCount = await prisma.emailJob.count({ where: { campaignId: activeCampaign.id, status: { in: ["PENDING", "PROCESSING"] } } });

    // Update Campaign Stats
    await prisma.emailCampaign.update({
      where: { id: activeCampaign.id },
      data: {
        sentCount,
        failedCount,
        pendingCount
      }
    });

    // Handle Delay
    try {
      const { provider } = await getProvider();
      const delay = getProviderDelay(provider, jobs.length, activeCampaign.delayMs);
      await new Promise(res => setTimeout(res, delay));
    } catch(e) {
      // If no provider active, default delay
      await new Promise(res => setTimeout(res, activeCampaign.delayMs));
    }

  } catch (error) {
    console.error("Worker error:", error);
  } finally {
    isRunning = false;
  }
};

const startWorker = () => {
  if (!workerTimer) {
    console.log("Starting Email Queue Worker...");
    workerTimer = setInterval(processQueue, WORKER_INTERVAL_MS);
  }
};

const stopWorker = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log("Stopped Email Queue Worker.");
  }
};

module.exports = {
  startWorker,
  stopWorker
};
