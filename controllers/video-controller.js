require("dotenv");
const router = require("express").Router();
const request = require("request-promise");

//YOUTUBE Constants
const apiKey = process.env.YOUTUBE_API_KEY;
const channelId = process.env.YOUTUBE_CHANNEL_ID;

////////////////////////////////////////////////
// YOUTUBE GET VIDEOS
////////////////////////////////////////////////
router.get("/videos", (req, res) => {
  request({
    url: `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${apiKey}`,
    method: "GET",
    headers: {
      authorization: apiKey,
      Accept: "application/json",
    },
  })
    .then((response) => {
      const videos = JSON.parse(response);
      res.status(200).json(videos);
    })
    .catch((err) => {
      console.log(err);
    });
});

////////////////////////////////////////////////
// YOUTUBE GET NEXT VIDEOS
////////////////////////////////////////////////
router.get("/videos/page/:id", (req, res) => {
  request({
    url: `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&pageToken=${req.params.id}&order=date&type=video&key=${apiKey}`,
    method: "GET",
    headers: {
      authorization: apiKey,
      Accept: "application/json",
    },
  })
    .then((response) => {
      const videos = JSON.parse(response);
      res.status(200).json(videos);
    })
    .catch((err) => {
      console.log(err);
    });
});

////////////////////////////////////////////////
// YOUTUBE GET CHANNEL ID
////////////////////////////////////////////////
router.get("/channel/id", (req, res) => {
  res.status(200).json({ channelId: channelId });
});

module.exports = router;
