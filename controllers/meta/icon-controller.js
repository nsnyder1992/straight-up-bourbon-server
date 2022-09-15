require("dotenv");
const router = require("express").Router();
const Icon = require("../../db").icon;

//auth
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE ICON
////////////////////////////////////////////////
router.post("/", validateSessionAdmin, (req, res) => {
  Icon.create({
    name: req.body.name,
    icon: req.body.icon,
    link: req.body.link,
  })
    .then(async (icon) => {
      res.status(200).json({
        icon: icon,
        message: "Icon successfully created",
      });
    })

    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

//////////////////////////////////////////////////////////////////////
// GET ALL ICONS
//////////////////////////////////////////////////////////////////////
router.get("/", async (req, res) => {
  Icon.findAll()
    .then((icons) => res.status(200).json({ icons }))
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET ICON BY ID
//////////////////////////////////////////////////////////////////////
router.get("/:id", validateSessionAdmin, (req, res) => {
  Icon.findOne({ where: { id: req.params.id } })
    .then((icon) => {
      res.status(200).json({
        name: icon.name,
        icon: icon.icon,
        link: icon.link,
      });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// UPDATE ICON
//////////////////////////////////////////////////////////////////////
router.put("/:id", validateSessionAdmin, async (req, res) => {
  try {
    const icon = await Icon.findOne({ where: { id: req.params.id } });

    await icon.update({
      name: req.body.name,
      icon: req.body.icon,
      link: req.body.link,
    });

    res.status(200).json({
      name: icon.name,
      icon: icon.icon,
      link: icon.link,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

//////////////////////////////////////////////////////////////////////
// DELETE ICON
//////////////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    await Icon.destroy({ where: { id: req.user.id } });

    res.status(200).json({ message: "Icon Removed" });
  } catch (err) {
    res.status(500).json({ err: err });
  }
});

module.exports = router;
