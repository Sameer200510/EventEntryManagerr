const prisma = require("../prismaClient");

async function migrateLegacyData() {
  try {
    // 1. Check if any UploadDataset lacks an eventId
    const datasetsToMigrate = await prisma.uploadDataset.findMany({
      where: { eventId: null }
    });

    const attendeesToMigrate = await prisma.attendee.count({
      where: { eventId: null }
    });

    if (datasetsToMigrate.length === 0 && attendeesToMigrate === 0) {
      console.log("No legacy data to migrate.");
      return;
    }

    console.log(`Found ${datasetsToMigrate.length} datasets and ${attendeesToMigrate} attendees to migrate.`);

    // 2. Create the Legacy Event
    const legacyEvent = await prisma.event.create({
      data: {
        name: "Legacy Farewell Event",
        type: "Farewell",
        date: new Date(),
        description: "Auto-generated event from legacy datasets.",
        isActive: true,
      }
    });

    console.log(`Created Legacy Event: ${legacyEvent.id}`);

    // 3. Update Datasets
    await prisma.uploadDataset.updateMany({
      where: { eventId: null },
      data: { eventId: legacyEvent.id }
    });

    // 4. Update Attendees
    await prisma.attendee.updateMany({
      where: { eventId: null },
      data: { eventId: legacyEvent.id }
    });

    // 5. Update ScanLogs
    await prisma.scanLog.updateMany({
      where: { eventId: null },
      data: { eventId: legacyEvent.id }
    });

    // 6. Update EmailCampaigns
    await prisma.emailCampaign.updateMany({
      where: { eventId: null },
      data: { eventId: legacyEvent.id }
    });

    console.log("Legacy data migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

module.exports = migrateLegacyData;
