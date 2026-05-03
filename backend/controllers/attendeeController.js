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

exports.uploadExcel = async (req, res) => {
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

    const allValidRolls = [];
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
      } else {
        allValidRolls.push(roll);
      }

      return record;
    });

    const existingAttendees = await prisma.attendee.findMany({
      where: { roll: { in: allValidRolls } },
      select: { roll: true },
    });

    const existingRollSet = new Set(
      existingAttendees.map((a) => a.roll.toUpperCase()),
    );

    const seenRollsInFile = new Set();
    const newAttendees = [];
    const outputData = [];

    const frontendHost =
      process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;

    for (const record of parsedData) {
      const outRow = { ...record.originalRow, Token: "", QR_Link: "" };

      if (record.status) {
        outRow.Status = record.status;
        outputData.push(outRow);
        continue;
      }

      if (existingRollSet.has(record.roll)) {
        outRow.Status = "Skipped - Duplicate in DB";
      } else if (seenRollsInFile.has(record.roll)) {
        outRow.Status = "Skipped - Duplicate in File";
      } else {
        seenRollsInFile.add(record.roll);

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

    if (newAttendees.length > 0) {
      await prisma.attendee.createMany({
        data: newAttendees,
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
    });

    if (!attendee) {
      return res.status(404).json({ error: "Attendee not found." });
    }

    if (!attendee.email) {
      return res.status(400).json({ error: "Attendee has no email address." });
    }

    const qrCodeDataUrl = await QRCode.toDataURL(attendee.qrLink);
    await sendQrEmail(attendee, qrCodeDataUrl, message);

    return res.status(200).json({
      message: `QR Code sent to ${attendee.email}`,
    });
  } catch (error) {
    console.error("Error sending manual email:", error);
    return res.status(500).json({ error: "Failed to send email." });
  }
};

exports.sendBulkEmails = async (req, res) => {
  return res.status(501).json({
    error:
      "Bulk email sending is not enabled yet. Add email queueing and delivery tracking before enabling this feature.",
  });
};

exports.getAllAttendees = async (req, res) => {
  try {
    const attendees = await prisma.attendee.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json(attendees);
  } catch (error) {
    console.error("Error fetching attendees:", error);
    return res.status(500).json({ error: "Failed to fetch attendees." });
  }
};
