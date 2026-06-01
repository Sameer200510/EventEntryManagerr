const prisma = require("../prismaClient");

exports.getAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: { checkpoints: { orderBy: { order: "asc" } } }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events." });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { checkpoints: { orderBy: { order: "asc" } } }
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch event." });
  }
};

exports.getActiveEvent = async (req, res) => {
  try {
    const event = await prisma.event.findFirst({
      where: { isActive: true },
      include: { checkpoints: { orderBy: { order: "asc" } } }
    });
    if (!event) return res.status(404).json({ error: "No active event found" });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active event." });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { name, type, date, venue, bannerImage, description, entryTiming, exitTiming, isSequential, checkpoints } = req.body;
    
    // Auto-activate the first event or if none are active
    const activeCount = await prisma.event.count({ where: { isActive: true } });
    
    const event = await prisma.event.create({
      data: {
        name,
        type,
        date: new Date(date),
        venue,
        bannerImage,
        description,
        entryTiming,
        exitTiming,
        isActive: activeCount === 0,
        isSequential: isSequential || false
      }
    });

    if (checkpoints && Array.isArray(checkpoints) && checkpoints.length > 0) {
      const cps = checkpoints.map((c, i) => ({
        eventId: event.id,
        name: c.name,
        order: c.order !== undefined ? c.order : i,
        isActive: c.isActive !== undefined ? c.isActive : true
      }));
      await prisma.checkpoint.createMany({ data: cps });
    }

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to create event." });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { name, type, date, venue, bannerImage, description, entryTiming, exitTiming, isSequential } = req.body;
    const event = await prisma.event.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        type,
        date: date ? new Date(date) : undefined,
        venue,
        bannerImage,
        description,
        entryTiming,
        exitTiming,
        isSequential
      }
    });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to update event." });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    await prisma.event.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: "Event deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event." });
  }
};

exports.activateEvent = async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.event.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
      await tx.event.update({
        where: { id: eventId },
        data: { isActive: true }
      });
    });
    res.json({ message: "Event activated." });
  } catch (error) {
    res.status(500).json({ error: "Failed to activate event." });
  }
};
