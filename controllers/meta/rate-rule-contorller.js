require("dotenv");
const router = require("express").Router();
const Rule = require("../../db").rules;

//is admin?
const validateSessionAdmin = require("../../middleware/validate-session-admin");

///////////////////////////////////////////////////////////////
//DELETE RATE RULE
///////////////////////////////////////////////////////////////
router.delete("/:id", validateSessionAdmin, async (req, res) => {
  try {
    //destroy all descriptions
    await Rule.destroy({ where: { id: req.params.id } });
    res.status(200).json({ message: "Rule Removed" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

module.exports = router;
