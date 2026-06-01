const xlsx = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const archiver = require("archiver");
const QRCode = require("qrcode");
const { sendQrEmail } = require("../utils/email");
const prisma = require("../prismaClient");

exports.scanAttendee = async (req, res) => {
  const ip =
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  const logScan = async (tx, data) => {
    try {
      await tx.scanLog.create({
        data: {
          attendeeId: data.attendeeId || null,
          scannedById: req.user?.id || null,
          scanType: data.type === "food" ? "FOOD" : "ENTRY",
          result: data.success ? "SUCCESS" : "DENIED",
          reason: data.resultCode,
          ip: data.ip,
          userAgent: data.userAgent,
        },
      });
    } catch (err) {
      console.error("ScanLog error:", err.message);
    }
  };

  try {
    const { token, type = "entry" } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!["entry", "food"].includes(type)) {
      return res.status(400).json({ error: "Invalid scan type." });
    }

    if (req.user.role === "ENTRY_VOLUNTEER" && type !== "entry") {
      return res
        .status(403)
        .json({ error: "Entry volunteers can only perform entry scans." });
    }

    if (req.user.role === "FOOD_VOLUNTEER" && type !== "food") {
      return res
        .status(403)
        .json({ error: "Food volunteers can only perform food scans." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const attendee = await tx.attendee.findUnique({
        where: { token },
      });

      if (!attendee) {
        await logScan(tx, {
          type,
          success: false,
          resultCode: "INVALID_TOKEN",
          ip,
          userAgent,
        });

        return {
          status: 404,
          payload: { error: "Invalid or unknown QR token." },
        };
      }

      if (type === "entry") {
        if (attendee.entryStatus) {
          if (attendee.entryOtpUsed) {
            await logScan(tx, {
              type,
              attendeeId: attendee.id,
              success: true,
              resultCode: "ALREADY_USED_OTP",
              ip,
              userAgent,
            });

            return {
              status: 200,
              payload: {
                alreadyVerified: true,
                entry_method: "OTP",
                message: `${attendee.name} was already verified via OTP.`,
                attendee: {
                  name: attendee.name,
                  roll: attendee.roll,
                  entryScannedAt: attendee.entryScannedAt,
                },
              },
            };
          }

          await logScan(tx, {
            type,
            attendeeId: attendee.id,
            success: false,
            resultCode: "ALREADY_USED_ENTRY",
            ip,
            userAgent,
          });

          return {
            status: 400,
            payload: {
              error: `${attendee.name} has already been scanned in for entry.`,
              attendee: {
                name: attendee.name,
                roll: attendee.roll,
                entryScannedAt: attendee.entryScannedAt,
              },
            },
          };
        }

        const updated = await tx.attendee.updateMany({
          where: {
            id: attendee.id,
            entryStatus: false,
          },
          data: {
            entryStatus: true,
            entryScannedAt: new Date(),
          },
        });

        if (updated.count === 0) {
          await logScan(tx, {
            type,
            attendeeId: attendee.id,
            success: false,
            resultCode: "ENTRY_RACE_CONFLICT",
            ip,
            userAgent,
          });

          return {
            status: 409,
            payload: { error: "Entry was just scanned by another device." },
          };
        }

        const finalAttendee = await tx.attendee.findUnique({
          where: { id: attendee.id },
        });

        await logScan(tx, {
          type,
          attendeeId: finalAttendee.id,
          success: true,
          resultCode: "ALLOWED_ENTRY",
          ip,
          userAgent,
        });

        return {
          status: 200,
          payload: {
            message: "Entry Allowed!",
            attendee: {
              name: finalAttendee.name,
              roll: finalAttendee.roll,
              entryScannedAt: finalAttendee.entryScannedAt,
            },
          },
        };
      }

      if (!attendee.entryStatus) {
        await logScan(tx, {
          type,
          attendeeId: attendee.id,
          success: false,
          resultCode: "ENTRY_REQUIRED_FOR_FOOD",
          ip,
          userAgent,
        });

        return {
          status: 400,
          payload: {
            error: `Entry required before food distribution for ${attendee.name}.`,
            attendee: {
              name: attendee.name,
              roll: attendee.roll,
            },
          },
        };
      }

      if (attendee.foodStatus) {
        await logScan(tx, {
          type,
          attendeeId: attendee.id,
          success: false,
          resultCode: "ALREADY_USED_FOOD",
          ip,
          userAgent,
        });

        return {
          status: 400,
          payload: {
            error: `Food already collected by ${attendee.name}.`,
            attendee: {
              name: attendee.name,
              roll: attendee.roll,
              foodScannedAt: attendee.foodScannedAt,
            },
          },
        };
      }

      const updated = await tx.attendee.updateMany({
        where: {
          id: attendee.id,
          foodStatus: false,
          entryStatus: true,
        },
        data: {
          foodStatus: true,
          foodScannedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        await logScan(tx, {
          type,
          attendeeId: attendee.id,
          success: false,
          resultCode: "FOOD_RACE_CONFLICT",
          ip,
          userAgent,
        });

        return {
          status: 409,
          payload: {
            error: "Food collection was just processed by another device.",
          },
        };
      }

      const finalAttendee = await tx.attendee.findUnique({
        where: { id: attendee.id },
      });

      await logScan(tx, {
        type,
        attendeeId: finalAttendee.id,
        success: true,
        resultCode: "ALLOWED_FOOD",
        ip,
        userAgent,
      });

      return {
        status: 200,
        payload: {
          message: "Food Distribution Allowed!",
          attendee: {
            name: finalAttendee.name,
            roll: finalAttendee.roll,
            foodScannedAt: finalAttendee.foodScannedAt,
          },
        },
      };
    });

    return res.status(result.status).json(result.payload);
  } catch (err) {
    console.error("Scan error:", err);
    return res.status(500).json({ error: "Server error during verification." });
  }
};

exports.parseExcel = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file provided." });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rows.length === 0) {
      return res.status(400).json({ error: "Excel sheet is empty." });
    }

    const headers = rows[0]
      .map((h) => (typeof h === "string" ? h.trim() : h))
      .filter((h) => h !== "");

    return res.json({ headers });
  } catch (error) {
    console.error("Error parsing Excel get-headers:", error);
    return res.status(500).json({ error: "Failed to parse Excel file." });
  }
};

exports.validateExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file provided." });
    }

    if (!req.body.mapping) {
      return res.status(400).json({ error: "No field mapping provided." });
    }

    let fieldMapping;
    try {
      fieldMapping = JSON.parse(req.body.mapping);
    } catch {
      return res.status(400).json({ error: "Invalid field mapping JSON." });
    }

    const {
      name: nameField,
      roll: rollField,
      email: emailField,
    } = fieldMapping;

    if (!nameField || !rollField) {
      return res
        .status(400)
        .json({ error: 'Mapping must include "name" and "roll".' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (rawData.length === 0) {
      return res
        .status(400)
        .json({ error: "Excel sheet is empty or only contains headers." });
    }

    let totalRows = rawData.length;
    let validRows = 0;
    let duplicateEmails = 0;
    let duplicateRolls = 0;
    let invalidEmails = 0;

    const seenRolls = new Set();
    const seenEmails = new Set();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const row of rawData) {
      const name = row[nameField] ? String(row[nameField]).trim() : "";
      const rawRoll = row[rollField] ? String(row[rollField]).trim() : "";
      const roll = rawRoll.toUpperCase();
      const email = emailField && row[emailField] ? String(row[emailField]).trim() : "";

      if (!name || !roll) {
        continue;
      }

      if (seenRolls.has(roll)) {
        duplicateRolls++;
      } else {
        seenRolls.add(roll);
        validRows++;
      }

      if (email) {
        if (!emailRegex.test(email)) {
          invalidEmails++;
        } else if (seenEmails.has(email.toLowerCase())) {
          duplicateEmails++;
        } else {
          seenEmails.add(email.toLowerCase());
        }
      }
    }

    return res.json({
      totalRows,
      validRows,
      duplicateRolls,
      duplicateEmails,
      invalidEmails
    });

  } catch (error) {
    console.error("Error validating Excel:", error);
    return res.status(500).json({ error: "Failed to validate Excel file." });
  }
};

exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file provided." });
    }

    if (!req.body.mapping) {
      return res.status(400).json({ error: "No field mapping provided." });
    }

    const eventName = req.body.eventName || "Untitled Event";
    const eventId = req.body.eventId;
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required." });
    }

    let fieldMapping;
    try {
      fieldMapping = JSON.parse(req.body.mapping);
    } catch {
      return res.status(400).json({ error: "Invalid field mapping JSON." });
    }

    const {
      name: nameField,
      roll: rollField,
      email: emailField,
    } = fieldMapping;

    if (!nameField || !rollField) {
      return res
        .status(400)
        .json({ error: 'Mapping must include "name" and "roll".' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (rawData.length === 0) {
      return res
        .status(400)
        .json({ error: "Excel sheet is empty or only contains headers." });
    }

    const parsedData = rawData.map((row) => {
      const name = row[nameField] ? String(row[nameField]).trim() : "";
      const rawRoll = row[rollField] ? String(row[rollField]).trim() : "";
      const roll = rawRoll.toUpperCase();
      const email =
        emailField && row[emailField] ? String(row[emailField]).trim() : "";

      const record = {
        originalRow: row,
        name,
        roll,
        email,
        status: "",
      };

      if (!name || !roll) {
        record.status = "Error - Missing required field(s)";
      }

      return record;
    });

    const seenRollsInFile = new Set();
    const newAttendees = [];
    const outputData = [];
    let validRecordsCount = 0;

    const frontendHost =
      process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;

    for (const record of parsedData) {
      const outRow = { ...record.originalRow, Token: "", QR_Link: "" };

      if (record.status) {
        outRow.Status = record.status;
        outputData.push(outRow);
        continue;
      }

      if (seenRollsInFile.has(record.roll)) {
        outRow.Status = "Skipped - Duplicate in File";
      } else {
        seenRollsInFile.add(record.roll);
        validRecordsCount++;

        const token = uuidv4();
        const qrLink = `${frontendHost}/verify/${token}`;

        outRow.Token = token;
        outRow.QR_Link = qrLink;
        outRow.Status = "Added";

        newAttendees.push({
          name: record.name,
          roll: record.roll,
          email: record.email,
          token,
          qrLink,
        });
      }

      outputData.push(outRow);
    }

    // Deactivate previous datasets
    await prisma.uploadDataset.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new dataset
    const      dataset = await prisma.uploadDataset.create({
        data: {
          eventName,
          eventId: Number(eventId),
          totalRecords: 0,
          validRecords: 0,
          isActive: false, 
          uploadedById: req.user?.userId || null,
        },
      });

    // Add datasetId to new attendees
    const attendeesToCreate = newAttendees.map(a => ({ ...a, datasetId: dataset.id, eventId: Number(eventId) }));

    if (attendeesToCreate.length > 0) {
      await prisma.attendee.createMany({
        data: attendeesToCreate,
        skipDuplicates: true,
      });
    }

    const outSheet = xlsx.utils.json_to_sheet(outputData);
    const outWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(outWorkbook, outSheet, "Processed");

    const excelBuffer = xlsx.write(outWorkbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="processed_attendees.zip"',
    );
    res.setHeader("Content-Type", "application/zip");

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archiver error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create ZIP archive." });
      }
    });

    archive.pipe(res);
    archive.append(excelBuffer, { name: "processed_attendees.xlsx" });

    const qrBuffers = await Promise.all(
      newAttendees.map(async (attendee) => ({
        name: `qrs/${attendee.roll}.png`,
        buffer: await QRCode.toBuffer(attendee.qrLink, {
          type: "png",
          margin: 2,
          width: 300,
        }),
      })),
    );

    for (const qr of qrBuffers) {
      archive.append(qr.buffer, { name: qr.name });
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error in upload-excel:", error);
    return res.status(500).json({ error: "Failed to process Excel file." });
  }
};

exports.sendManualEmail = async (req, res) => {
  try {
    const attendeeId = Number(req.params.id);

    if (!Number.isInteger(attendeeId)) {
      return res.status(400).json({ error: "Invalid attendee ID." });
    }

    const { message } = req.body;

    const attendee = await prisma.attendee.findUnique({
      where: { id: attendeeId },
      include: { event: true }
    });

    if (!attendee) {
      return res.status(404).json({ error: "Attendee not found." });
    }

    if (!attendee.email) {
      return res.status(400).json({ error: "Attendee has no email address." });
    }

    const qrCodeDataUrl = await QRCode.toDataURL(attendee.qrLink);
    await sendQrEmail(attendee, attendee.event, qrCodeDataUrl, message);

    return res.status(200).json({
      message: `QR Code sent to ${attendee.email}`,
    });
  } catch (error) {
    console.error("Error sending manual email:", error);
    return res.status(500).json({ error: "Failed to send email." });
  }
};

exports.startCampaign = async (req, res) => {
  try {
    const { batchSize = 50, delayMs = 10000, providerName = "RESEND", eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: "eventId is required" });

    // Verify no running campaign for this event
    const running = await prisma.emailCampaign.findFirst({
      where: { status: "RUNNING", eventId: Number(eventId) }
    });
    if (running) {
      return res.status(400).json({ error: "A campaign is already running for this event." });
    }

    const attendees = await prisma.attendee.findMany({
      where: { eventId: Number(eventId), email: { not: null, not: "" } }
    });

    if (attendees.length === 0) {
      return res.status(400).json({ error: "No attendees with emails found in active dataset." });
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const camp = await tx.emailCampaign.create({
        data: {
          name: `Campaign for Event ${eventId}`,
          status: "RUNNING",
          eventId: Number(eventId),
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

      // Split chunks to avoid insert limits if dataset is huge, but typically it's fine for ~2000
      await tx.emailJob.createMany({ data: jobsData });
      return camp;
    });

    res.json({ message: "Campaign started", campaign });
  } catch (error) {
    console.error("Start campaign error:", error);
    res.status(500).json({ error: "Failed to start campaign." });
  }
};

exports.getActiveCampaign = async (req, res) => {
  try {
    const { eventId } = req.query;
    const active = await prisma.emailCampaign.findFirst({
      where: { 
        status: { in: ["RUNNING", "PAUSED"] },
        ...(eventId ? { eventId: Number(eventId) } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    if (!active) {
      return res.json(null);
    }
    res.json(active);
  } catch (error) {
    console.error("Get campaign error:", error);
    res.status(500).json({ error: "Failed to fetch active campaign." });
  }
};

exports.pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await prisma.emailCampaign.update({
      where: { id: Number(id) },
      data: { status: "PAUSED" }
    });
    res.json(camp);
  } catch (error) {
    res.status(500).json({ error: "Failed to pause." });
  }
};

exports.resumeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await prisma.emailCampaign.update({
      where: { id: Number(id) },
      data: { status: "RUNNING" }
    });
    res.json(camp);
  } catch (error) {
    res.status(500).json({ error: "Failed to resume." });
  }
};

exports.cancelCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await prisma.$transaction(async (tx) => {
      await tx.emailJob.updateMany({
        where: { campaignId: Number(id), status: { in: ["PENDING", "PROCESSING"] } },
        data: { status: "CANCELLED" }
      });
      return tx.emailCampaign.update({
        where: { id: Number(id) },
        data: { status: "CANCELLED" }
      });
    });
    res.json(camp);
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel." });
  }
};

exports.getCampaignReport = async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await prisma.emailCampaign.findUnique({
      where: { id: Number(id) }
    });
    const failedJobs = await prisma.emailJob.findMany({
      where: { campaignId: Number(id), status: { in: ["FAILED", "PERM_FAILED"] } },
      include: { attendee: { select: { email: true, name: true, roll: true } } }
    });
    res.json({ campaign: camp, failedJobs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch report." });
  }
};

exports.getAllAttendees = async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "eventId is required" });

    const attendees = await prisma.attendee.findMany({
      where: { eventId: Number(eventId) },
      orderBy: { createdAt: "desc" },
    });

    return res.json(attendees);
  } catch (error) {
    console.error("Error fetching attendees:", error);
    return res.status(500).json({ error: "Failed to fetch attendees." });
  }
};

exports.getDatasets = async (req, res) => {
  try {
    const { eventId } = req.query;
    const datasets = await prisma.uploadDataset.findMany({
      where: eventId ? { eventId: Number(eventId) } : {},
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { name: true } }
      }
    });
    res.json(datasets);
  } catch (err) {
    console.error("Error fetching datasets:", err);
    res.status(500).json({ error: "Failed to fetch datasets" });
  }
};

exports.restoreDataset = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.$transaction(async (tx) => {
      // Deactivate all
      await tx.uploadDataset.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      // Activate target
      await tx.uploadDataset.update({
        where: { id: Number(id) },
        data: { isActive: true }
      });
    });

    res.json({ message: "Dataset restored successfully" });
  } catch (err) {
    console.error("Error restoring dataset:", err);
    res.status(500).json({ error: "Failed to restore dataset" });
  }
};

exports.deleteDataset = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.uploadDataset.delete({
      where: { id: Number(id) }
    });
    res.json({ message: "Dataset deleted successfully" });
  } catch (err) {
    console.error("Error deleting dataset:", err);
    res.status(500).json({ error: "Failed to delete dataset" });
  }
};

exports.clearAttendees = async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required to clear attendees." });
    }
    
    await prisma.attendee.deleteMany({
      where: { eventId: Number(eventId) }
    });
    
    await prisma.uploadDataset.updateMany({
      where: { eventId: Number(eventId) },
      data: { isActive: false }
    });
    
    res.json({ message: "Attendee list cleared successfully for the event!" });
  } catch (err) {
    console.error("Error clearing attendees:", err);
    res.status(500).json({ error: "Failed to clear attendees" });
  }
};
