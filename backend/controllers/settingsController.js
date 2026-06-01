const prisma = require("../prismaClient");
const { encryptJSON, decryptJSON } = require("../utils/crypto");
const { getProvider } = require("../utils/email");

exports.getProviders = async (req, res) => {
  try {
    const providers = await prisma.emailProvider.findMany({
      orderBy: { id: "asc" },
    });
    
    // Mask credentials before sending to UI
    const maskedProviders = providers.map(p => {
      let fields = {};
      try {
        const creds = decryptJSON(p.credentials);
        Object.keys(creds).forEach(k => {
          fields[k] = creds[k] ? "********" : "";
        });
      } catch (e) {
         fields = { error: "Failed to decrypt" };
      }
      return {
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        senderEmail: p.senderEmail,
        updatedAt: p.updatedAt,
        fields
      };
    });
    
    res.json(maskedProviders);
  } catch (error) {
    console.error("Error fetching providers:", error);
    res.status(500).json({ error: "Failed to fetch providers." });
  }
};

exports.saveProvider = async (req, res) => {
  try {
    const { name, senderEmail, credentials } = req.body;
    
    if (!name || !senderEmail || !credentials) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const encryptedStr = encryptJSON(credentials);

    await prisma.$transaction(async (tx) => {
      // Find current active to log
      const currentActive = await tx.emailProvider.findFirst({
        where: { isActive: true }
      });
      
      // Deactivate all
      await tx.emailProvider.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      // Insert or Update the target provider
      const existing = await tx.emailProvider.findFirst({
        where: { name }
      });

      if (existing) {
        await tx.emailProvider.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            senderEmail,
            credentials: encryptedStr
          }
        });
      } else {
        await tx.emailProvider.create({
          data: {
            name,
            isActive: true,
            senderEmail,
            credentials: encryptedStr
          }
        });
      }

      // Log the change
      const prevName = currentActive ? currentActive.name : "None";
      await tx.auditLog.create({
        data: {
          adminId: req.user?.id || null,
          action: "CHANGED_EMAIL_PROVIDER",
          details: `From ${prevName} to ${name}`
        }
      });
    });

    res.json({ message: "Provider saved successfully." });
  } catch (error) {
    console.error("Error saving provider:", error);
    res.status(500).json({ error: "Failed to save provider." });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const { provider, instance } = await getProvider();
    
    // Attempt to send a minimal test email
    const toEmail = req.user?.email || "admin@example.com";
    let success = false;
    
    if (provider.name === "RESEND") {
      const res = await instance.emails.send({
        from: provider.senderEmail,
        to: toEmail,
        subject: "Test Connection",
        html: "<p>This is a test email.</p>",
      });
      if (res.error) {
        throw new Error(res.error.message || JSON.stringify(res.error));
      }
      success = true;
    } else {
      await instance.sendMail({
        from: provider.senderEmail,
        to: toEmail,
        subject: "Test Connection",
        html: "<p>This is a test email.</p>",
      });
      success = true;
    }

    if (success) {
      res.json({ message: "Connection successful." });
    }
  } catch (error) {
    console.error("Error testing connection:", error);
    res.status(500).json({ error: error.message || "Connection failed." });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { name: true } }
      },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs." });
  }
};
