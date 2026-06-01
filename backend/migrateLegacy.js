require('dotenv').config();
const prisma = require('./prismaClient');

async function main() {
  // Check if there are any attendees without a dataset
  const attendeesToMigrate = await prisma.attendee.count({
    where: { datasetId: null }
  });

  if (attendeesToMigrate === 0) {
    console.log("No legacy attendees to migrate.");
    return;
  }

  console.log(`Found ${attendeesToMigrate} legacy attendees. Creating 'Legacy Dataset'...`);

  const legacyDataset = await prisma.uploadDataset.create({
    data: {
      eventName: "Legacy Upload (Before Version 2)",
      totalRecords: attendeesToMigrate,
      validRecords: attendeesToMigrate,
      isActive: true,
    }
  });

  const res = await prisma.attendee.updateMany({
    where: { datasetId: null },
    data: { datasetId: legacyDataset.id }
  });

  console.log(`Successfully migrated ${res.count} attendees to dataset ID ${legacyDataset.id}.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
