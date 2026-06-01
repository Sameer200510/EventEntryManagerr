const prisma = require("../prismaClient");

exports.getAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events." });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch event." });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { name, type, date, venue, bannerImage, description, entryTiming, exitTiming } = req.body;
    
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
        isActive: activeCount === 0
      }
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to create event." });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { name, type, date, venue, bannerImage, description, entryTiming, exitTiming } = req.body;
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
        exitTiming
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
