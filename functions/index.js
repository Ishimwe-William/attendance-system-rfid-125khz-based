/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// import necessary modules
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

// when this cloud function is already deployed, change the origin to 'https://your-deployed-app-url
const cors = require("cors")({origin: true});

// create and config transporter
const transporter = nodemailer.createTransport({
  host: process.env.REACT_APP_EMAIL_SENDER_HOST,
  port: process.env.REACT_APP_EMAIL_SENDER_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.REACT_APP_EMAIL_SENDER_USERNAME,
    pass: process.env.REACT_APP_EMAIL_SENDER_PASSWORD,
  },
});

// export the cloud function called `sendEmail`
exports.sendEmail = functions.https.onRequest((req, res) => {
  console.log("host: ", process.env.REACT_APP_EMAIL_SENDER_HOST);
  if (!req.body.data || !req.body.data.email ||
      !req.body.data.name || !req.body.data.message) {
    return res.status(400).send({
      data: {
        status: 400,
        message: "Invalid request body",
      },
    });
  }

  // for testing purposes
  console.log(
      "from sendEmail function. The request object is:",
      JSON.stringify(req.body),
  );

  // enable CORS using the `cors` express middleware.
  cors(req, res, async () => {
    // get contact form data from the req and then assigned it to variables
    const email = req.body.data.email;
    const name = req.body.data.name;
    const message = req.body.data.message;

    // config the email message
    const mailOptions = {
      from: process.env.REACT_APP_EMAIL_SENDER_USERNAME,
      to: email,
      subject: "New message from Attendance System",
      text: `Attendance: ${name}\n${message}`,
    };

    try {
      // call the built in `sendMail` function and return
      // different responses upon success and failure
      await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve(info);
          }
        });
      });

      return res.status(200).send({
        data: {
          status: 200,
          message: "sent",
        },
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).send({
        data: {
          status: 500,
          message: error.toString(),
        },
      });
    }
  });
});
