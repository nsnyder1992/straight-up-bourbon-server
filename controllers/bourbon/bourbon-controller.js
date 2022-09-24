require("dotenv");
const router = require("express").Router();
const Bourbon = require("../../db").bourbon;

//special db operators
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

//auth
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE BOURBON
////////////////////////////////////////////////
router.post("/", validateSessionAdmin, (req, res) => {
  Bourbon.create({ ...req.body })
    .then(async (bourbon) => {
      res.status(200).json({ ...bourbon });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

//////////////////////////////////////////////////////////////////////
// GET ALL BOURBONS
//////////////////////////////////////////////////////////////////////
router.get("/:page/:limit", async (req, res) => {
  Bourbon.findAll()
    .then((bourbons) => res.status(200).json({ bourbons }))
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET BOURBON BY ID
//////////////////////////////////////////////////////////////////////
router.get("/:id", validateSessionAdmin, (req, res) => {
  Bourbon.findOne({ where: { id: req.params.id } })
    .then((bourbon) => {
      res.status(200).json({ ...bourbon });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET PICKS OF THE WEEK
//////////////////////////////////////////////////////////////////////
router.get("/picks/of/the/week", validateSessionAdmin, (req, res) => {
  Bourbon.findAll({
    where: { pickOfTheWeek: { [Op.ne]: null } },
    order: [["updatedAt"], ["pickOfTheWeek", "DESC"]],
    limit: 2,
  })
    .then((bourbons) => {
      res.status(200).json({ bourbons });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// UPDATE BOURBON
//////////////////////////////////////////////////////////////////////
router.put("/:id", validateSessionAdmin, async (req, res) => {
  try {
    const bourbon = await Bourbon.findOne({ where: { id: req.params.id } });

    await bourbon.update({ ...req.body });

    res.status(200).json({ ...bourbon });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

//////////////////////////////////////////////////////////////////////
// DELETE BOURBON
//////////////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    await Bourbon.destroy({ where: { id: req.params.id } });

    res.status(200).json({ message: "Bourbon Removed" });
  } catch (err) {
    res.status(500).json({ err: err });
  }
});

module.exports = router;
