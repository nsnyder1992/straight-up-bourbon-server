require("dotenv");
const router = require("express").Router();
const Meta = require("../../db").meta;

//sequelize
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

//auth
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE META
////////////////////////////////////////////////
router.post("/", validateSessionAdmin, (req, res) => {
  Meta.create({
    path: req.body.path,
    message: req.body.message,
    type: req.body.type,
  })
    .then(async (meta) => {
      res.status(200).json({
        meta: meta,
        message: "Icon successfully created",
      });
    })

    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

//////////////////////////////////////////////////////////////////////
// GET ALL META
//////////////////////////////////////////////////////////////////////
router.get("/", async (req, res) => {
  Meta.findAll()
    .then((meta) => res.status(200).json({ meta }))
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET META BY ID
//////////////////////////////////////////////////////////////////////
router.get("/:id", (req, res) => {
  Meta.findOne({ where: { id: req.params.id } })
    .then((meta) => {
      res.status(200).json({
        path: meta.path,
        message: meta.message,
        type: meta.type,
      });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET META LIKE PATH
//////////////////////////////////////////////////////////////////////
router.get("/by/path/", (req, res) => {
  Meta.findAll({
    where: {
      path: {
        [Op.like]: req.body.path,
      },
    },
  })
    .then((metas) => {
      res.status(200).json(metas);
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// UPDATE META
//////////////////////////////////////////////////////////////////////
router.put("/:id", validateSessionAdmin, async (req, res) => {
  try {
    const meta = await Meta.findOne({ where: { id: req.params.id } });

    await meta.update({
      path: req.body.path,
      message: req.body.message,
      type: req.body.type,
    });

    res.status(200).json({
      path: meta.path,
      message: meta.message,
      type: meta.type,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

//////////////////////////////////////////////////////////////////////
// DELETE META
//////////////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    await Meta.destroy({ where: { id: req.user.id } });

    res.status(200).json({ message: "Icon Removed" });
  } catch (err) {
    res.status(500).json({ err: err });
  }
});

module.exports = router;
