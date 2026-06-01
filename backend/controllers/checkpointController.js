const prisma = require("../prismaClient");

exports.getEventCheckpoints = async (req, res) => {
  try {
    const { eventId } = req.params;
    const checkpoints = await prisma.checkpoint.findMany({
      where: { eventId: parseInt(eventId) },
      orderBy: { order: "asc" }
    });
    res.json(checkpoints);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch checkpoints." });
  }
};

exports.createCheckpoint = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, order, isActive } = req.body;
    
    const checkpoint = await prisma.checkpoint.create({
      data: {
        eventId: parseInt(eventId),
        name,
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.status(201).json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: "Failed to create checkpoint." });
  }
};

exports.updateCheckpoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order, isActive } = req.body;
    
    const checkpoint = await prisma.checkpoint.update({
      where: { id: parseInt(id) },
      data: {
        name,
        order,
        isActive
      }
    });
    res.json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: "Failed to update checkpoint." });
  }
};

exports.deleteCheckpoint = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.checkpoint.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Checkpoint deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete checkpoint." });
  }
};

exports.batchUpdateCheckpoints = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { checkpoints } = req.body; // Array of {id, name, order, isActive, _isNew, _isDeleted}
    
    const results = await prisma.$transaction(async (tx) => {
      // Handle deletes
      const toDelete = checkpoints.filter(c => c._isDeleted && c.id).map(c => c.id);
      if (toDelete.length > 0) {
        await tx.checkpoint.deleteMany({
          where: { id: { in: toDelete }, eventId: parseInt(eventId) }
        });
      }
      
      // Handle updates and creates
      const updated = [];
      for (const c of checkpoints) {
        if (c._isDeleted) continue;
        
        if (c.id && !c._isNew) {
          const up = await tx.checkpoint.update({
            where: { id: c.id },
            data: { name: c.name, order: c.order, isActive: c.isActive }
          });
          updated.push(up);
        } else {
          const cr = await tx.checkpoint.create({
            data: { eventId: parseInt(eventId), name: c.name, order: c.order, isActive: c.isActive }
          });
          updated.push(cr);
        }
      }
      return updated;
    });
    
    res.json(results);
  } catch (error) {
    console.error("Batch update error:", error);
    res.status(500).json({ error: "Failed to batch update checkpoints." });
  }
};
