require("dotenv");
const router = require("express").Router();

const fetch = require("node-fetch");

//Cloudinary Constants
const apiKey = process.env.YOUTUBE_API_KEY;
const channel = process.env.YOUTUBE_CHANNEL_ID;

////////////////////////////////////////////////
// GET YOUTUBE VIDEOS
////////////////////////////////////////////////
router.get("/", (req, res) => {
  fetch(
    `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel}&maxResults=50&order=date&type=video&key=${apiKey}`,
    {
      method: "GET",
      headers: {
        authorization: apiKey,
        Accept: "application/json",
      },
    }
  )
    .then((json) => res.status(200).json(json))
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

module.exports = router;
