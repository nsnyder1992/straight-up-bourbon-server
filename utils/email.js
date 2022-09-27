require("dotenv");

//email
const nodemailer = require("nodemailer");

const mail = require("@sendgrid/mail");

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
          console.log(err);
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

const sendGridEmail = async (
  templateId,
  email,
  title,
  order,
  status,
  message,
  link,
  salutaion,
  signage
) => {
  try {
    mail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      from: {
        email: process.env.EMAIL_ADDRESS_DOMAIN,
      },
      replyTo: {
        email: process.env.EMAIL_ADDRESS,
        name: "Example Customer Service Team",
      },
      subject: title,
      personalizations: [
        {
          to: [
            {
              email: email,
            },
          ],
          dynamic_template_data: {
            order: order,
            status: status,
            link: link,
            message: message,
            salutation: salutaion,
            signage: signage,
          },
        },
      ],
      template_id: templateId,
    };

    await mail
      .send(msg)
      .then(() => {
        console.log("Email sent");
      })
      .catch((error) => {
        console.error(error);
        return error;
      });
  } catch (err) {
    console.log(err);
    return err;
  }
};

exports.sendGridEmail = sendGridEmail;

const sendContactUs = async (templateId, email, title, message, signage) => {
  try {
    mail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      from: {
        email: process.env.EMAIL_ADDRESS_DOMAIN,
      },
      replyTo: {
        email: process.env.EMAIL_ADDRESS,
        name: "Customer Service Team",
      },
      subject: title,
      personalizations: [
        {
          to: [
            {
              email: process.env.ADMIN_EMAIL,
            },
          ],
          dynamic_template_data: {
            email: email,
            message: message,
            signage: signage,
          },
        },
      ],
      template_id: templateId,
    };

    await mail
      .send(msg)
      .then(() => {
        console.log("Email sent");
        return { success: true };
      })
      .catch((error) => {
        console.error(error);
        return error;
      });
  } catch (err) {
    console.log(err);
    return err;
  }
};

exports.sendContactUs = sendContactUs;
