require("dotenv");

//email
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const sendEmail = async (email, title, message) => {
  try {
    const oauth2Client = new OAuth2(
      process.env.EMAIL_CLIENT_ID,
      process.env.EMAIL_CLIENT_SECRET,
      process.env.HOST
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.EMAIL_REFRESH_TOKEN,
    });

    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          reject(
            "********************SENDING EMAIL ERROR: Failed to create access token :(*********************"
          );
        }
        resolve(token);
      });
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
        accessToken,
        clientId: process.env.EMAIL_CLIENT_ID,
        clientSecret: process.env.EMAIL_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_REFRESH_TOKEN,
      },
    });

    const mailOptions = {
      from: "straightupbourbon@gmail.com",
      to: email,
      subject: title,
      text: message,
    };

    console.log("sending email");

    transporter.sendMail(mailOptions, (err, response) => {
      if (err) {
        console.log("error: ", err);
      } else {
        console.log("success: ", response);
      }
    });
  } catch (err) {
    console.log(err);
  }
};

exports.sendEmail = sendEmail;

const getTransponder = async () => {
  try {
    const oauth2Client = new OAuth2(
      process.env.EMAIL_CLIENT_ID,
      process.env.EMAIL_CLIENT_SECRET,
      process.env.HOST
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.EMAIL_REFRESH_TOKEN,
    });

    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          reject(
            "********************SENDING EMAIL ERROR: Failed to create access token :(*********************"
          );
        }
        resolve(token);
      });
    });

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
        accessToken,
        clientId: process.env.EMAIL_CLIENT_ID,
        clientSecret: process.env.EMAIL_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_REFRESH_TOKEN,
      },
    });
  } catch (err) {
    console.log(err);
  }
};

const sendTemplateEmail = async (email, title, message) => {
  try {
    const transporter = await getTransponder();

    ejs.renderFile(
      __dirname + "/templates/welcome.ejs",
      { receiver: email, content: message },
      (err, data) => {
        if (err) return console.log(err);

        const mailOptions = {
          from: "straightupbourbon@gmail.com",
          to: email,
          subject: title,
          text: message,
          html: data,
        };

        console.log("sending email");

        transporter.sendMail(mailOptions, (err, response) => {
          if (err) {
            return console.log("error: ", err);
          }
          console.log("success: ", response);
        });
      }
    );
  } catch (err) {
    console.log(err);
  }
};

exports.sendTemplateEmail = sendTemplateEmail;
