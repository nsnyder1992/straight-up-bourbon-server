require("dotenv");
const router = require("express").Router();
const Image = require("../../db").images;

//auth
const validateSessionAdmin = require("../../middleware/validate-session-admin");

////////////////////////////////////////////////
// CREATE IMAGE
////////////////////////////////////////////////
router.post("/", validateSessionAdmin, (req, res) => {
  Image.create({
    name: req.body.name,
    url: req.body.url,
  })
    .then(async (image) => {
      res.status(200).json({
        image,
        message: "Image successfully created",
      });
    })

    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

//////////////////////////////////////////////////////////////////////
// GET ALL IMAGES
//////////////////////////////////////////////////////////////////////
router.get("/:page/:limit", async (req, res) => {
  //setup pagination constants
  const limit = req.params.limit;
  const offset = (req.params.page - 1) * limit;

  const query = {
    limit: limit,
    offset: offset,
    order: [["createdAt", "ASC"]],
  };

  //get total number of products
  const total = await Image.count();

  Image.findAll(query)
    .then((images) => res.status(200).json({ images, total }))
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// GET IMAGE BY ID
//////////////////////////////////////////////////////////////////////
router.get("/:id", validateSessionAdmin, (req, res) => {
  Image.findOne({ where: { id: req.params.id } })
    .then((image) => {
      res.status(200).json({
        name: image.name,
        url: image.url,
      });
    })
    .catch((err) => res.status(500).json({ err: err }));
});

//////////////////////////////////////////////////////////////////////
// UPDATE IMAGE
//////////////////////////////////////////////////////////////////////
router.put("/:id", validateSessionAdmin, async (req, res) => {
  try {
    const image = await Image.findOne({ where: { id: req.params.id } });

    await image.update({
      name: req.body.name,
      url: req.body.url,
    });

    res.status(200).json({
      name: image.name,
      url: image.url,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

//////////////////////////////////////////////////////////////////////
// DELETE IMAGE
//////////////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    await Image.destroy({ where: { id: req.user.id } });

    res.status(200).json({ message: "Image Removed" });
  } catch (err) {
    res.status(500).json({ err: err });
  }
});

module.exports = router;
