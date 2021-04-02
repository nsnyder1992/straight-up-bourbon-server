require("dotenv");
const router = require("express").Router();
const Descriptions = require("../../db").descriptions;

//is admin?
const validateSessionAdmin = require("../../middleware/validate-session-admin");

///////////////////////////////////////////////////////////////
//DELETE POST
///////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    //destroy all descriptions
    await Descriptions.destroy({ where: { id: req.params.id } });

    res.status(200).json({ message: "Description Removed" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

module.exports = router;
