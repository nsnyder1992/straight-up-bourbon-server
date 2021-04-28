const jwt = require("jsonwebtoken");
const User = require("../db").sequelize.import("../models/user.js");

const getSession = (req, res, next) => {
  const token = req.headers.authorization;
  console.log("token -->", token);
  if (!token) {
    return res.status(403).send({ auth: false, message: "No token provided" });
  } else {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodeToken) => {
      // console.log("decodeToken --> ", decodeToken);
      if (!err && decodeToken) {
        User.findOne({
          where: {
            id: decodeToken.id,
          },
        })
          .then((user) => {
            req.user = user;
            return next();
          })
          .catch((err) => next(err));
      }
    });
  }
};

module.exports = getSession;
