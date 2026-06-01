const prisma = require("../prismaClient");

exports.getTemplates = async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId is required" });
    const templates = await prisma.emailTemplate.findMany({
      where: { eventId: Number(eventId) },
      orderBy: { createdAt: "desc" }
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { eventId, name, subject, htmlBody } = req.body;
    if (!eventId) return res.status(400).json({ error: "eventId is required" });
    const template = await prisma.emailTemplate.create({
      data: { eventId: Number(eventId), name, subject, htmlBody }
    });
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: "Failed to create template" });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { name, subject, htmlBody } = req.body;
    const template = await prisma.emailTemplate.update({
      where: { id: Number(req.params.id) },
      data: { name, subject, htmlBody }
    });
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: "Failed to update template" });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await prisma.emailTemplate.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Template deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete template" });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId is required" });
    const campaigns = await prisma.emailCampaign.findMany({
      where: { eventId: Number(eventId) },
      include: { template: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
};

exports.startCampaign = async (req, res) => {
  try {
    const { 
      eventId, 
      name, 
      templateId, 
      scheduledAt, 
      batchSize = 50, 
      delayMs = 10000, 
      providerName = "RESEND",
      target = "all", // "all" or "pending"
    } = req.body;

    if (!eventId) return res.status(400).json({ error: "eventId is required" });
    
    // Optional: check if a running campaign exists, though maybe we allow multiple scheduled/running now?
    // Let's just create it.
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

    const attendeeQuery = { eventId: Number(eventId), email: { not: null, not: "" } };
    if (target === "pending") {
      // Find attendees who don't have a successful or pending job in ANY campaign for this event
      // Or simply ones that are not sent. For simplicity, attendees where emailSent/etc is not true.
      // Wait, currently attendee has no emailSent flag. We rely on jobs.
      // Let's just find attendees who have NO successful email jobs for this event.
      attendeeQuery.emailJobs = {
        none: { status: { in: ["SENT", "PROCESSING", "PENDING"] } }
      };
    }

    const attendees = await prisma.attendee.findMany({ where: attendeeQuery });

    if (attendees.length === 0) {
      return res.status(400).json({ error: "No target attendees found." });
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const camp = await tx.emailCampaign.create({
        data: {
          eventId: Number(eventId),
          name: name || `Campaign ${new Date().toLocaleString()}`,
          status: isScheduled ? "SCHEDULED" : "RUNNING",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          templateId: templateId ? Number(templateId) : null,
          totalCount: attendees.length,
          pendingCount: attendees.length,
          batchSize: Number(batchSize),
          delayMs: Number(delayMs),
          providerName
        }
      });

      const jobsData = attendees.map(a => ({
        campaignId: camp.id,
        attendeeId: a.id,
        status: "PENDING"
      }));

      // Split into chunks if needed, but createMany handles thousands fine.
      await tx.emailJob.createMany({ data: jobsData });
      return camp;
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error("Failed to create campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
};

exports.trackOpen = async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    const job = await prisma.emailJob.findUnique({ where: { trackingId } });
    if (job && !job.openedAt) {
      await prisma.$transaction([
        prisma.emailJob.update({
          where: { id: job.id },
          data: { openedAt: new Date() }
        }),
        prisma.emailCampaign.update({
          where: { id: job.campaignId },
          data: { openedCount: { increment: 1 } }
        })
      ]);
    }

    // Return a 1x1 transparent GIF
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", 
      "base64"
    );
    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Content-Length": pixel.length,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    res.end(pixel);
  } catch (error) {
    // If tracking fails, don't crash, just return 404 or the pixel anyway
    res.status(404).end();
  }
};

exports.retryFailed = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      const failedJobs = await tx.emailJob.findMany({
        where: { campaignId: Number(id), status: { in: ["FAILED", "PERM_FAILED"] } }
      });
      
      if (failedJobs.length > 0) {
        await tx.emailJob.updateMany({
          where: { campaignId: Number(id), status: { in: ["FAILED", "PERM_FAILED"] } },
          data: { status: "PENDING", retries: 0, errorMessage: null }
        });
        
        // Update campaign counts
        await tx.emailCampaign.update({
          where: { id: Number(id) },
          data: { 
            failedCount: { decrement: failedJobs.length },
            pendingCount: { increment: failedJobs.length },
            status: "RUNNING" // kick it back to running if it was completed
          }
        });
      }
    });
    res.json({ message: "Failed jobs queued for retry." });
  } catch (error) {
    res.status(500).json({ error: "Failed to retry jobs" });
  }
};
