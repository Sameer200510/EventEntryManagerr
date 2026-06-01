require("dotenv").config({ path: __dirname + "/../.env" });
const prisma = require("../prismaClient");
const bcrypt = require("bcryptjs");

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const user = await prisma.user.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      passwordHash: hashedPassword,
      role: "ADMIN"
    }
  });

  console.log("Admin user seeded successfully:", user.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
