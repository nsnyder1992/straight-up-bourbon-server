require("dotenv");
const router = require("express").Router();

//is admin?
const validateSessionAdmin = require("../middleware/validate-session-admin");

//Cloudinary Constants
const cloudinary = require("cloudinary");
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

////////////////////////////////////////////////
// CLOUDINARY POST SIGNATURE
////////////////////////////////////////////////
router.get("/:publicId", validateSessionAdmin, (req, res) => {
  //required constants by cloudinary api
  const timestamp = Math.round(new Date().getTime() / 1000);
  const public_id = `id-${timestamp}-${req.params.publicId}`;
  const folder = process.env.CLOUDINARY_FOLDER;

  const params_to_sign = {
    timestamp: timestamp,
    folder: folder,
    public_id: public_id,
  };

  //get signature to return to client
  const sig = cloudinary.utils.api_sign_request(params_to_sign, apiSecret);

  //return all parameters
  res.status(200).json({
    signature: sig,
    timestamp: timestamp,
    folder: folder,
    public_id: public_id,
    key: apiKey,
  });
});

module.exports = router;
