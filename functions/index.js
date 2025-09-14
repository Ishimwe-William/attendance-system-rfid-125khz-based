const {setGlobalOptions} = require("firebase-functions");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

// Create and config transport
const transporter = nodemailer.createTransport({
  host: process.env.REACT_APP_EMAIL_SENDER_HOST,
  port: process.env.REACT_APP_EMAIL_SENDER_PORT,
  secure: false,
  auth: {
    user: process.env.REACT_APP_EMAIL_SENDER_USERNAME,
    pass: process.env.REACT_APP_EMAIL_SENDER_PASSWORD,
  },
});

// Firestore trigger for attendance checkout
exports.onAttendanceCheckout = onDocumentUpdated("attendance/{attendanceId}",
    async (event) => {
      const before = event.data.before.data();
      const after = event.data.after.data();

      // Check if checkOutTime was added (student just checked out)
      if (!before.checkOutTime && after.checkOutTime) {
        try {
          console.log("Student checked out:", event.params.attendanceId);

          // Get student email from studentId or rfidTag
          let studentEmail;
          let studentName;

          if (after.studentId && after.rfidTag) {
            // Manual entry - use studentId directly
            const studentDoc = await db.collection("students")
                .doc(after.studentId).get();
            if (studentDoc.exists) {
              const studentData = studentDoc.data();
              studentEmail = studentData.email;
              studentName = studentData.name;
            }
          } else if (after.studentId) {
            // Device entry - studentId is actually the rfidTag
            const studentsQuery = await db.collection("students")
                .where("rfidTag", "==", after.studentId)
                .limit(1)
                .get();

            if (!studentsQuery.empty) {
              const studentData = studentsQuery.docs[0].data();
              studentEmail = studentData.email;
              studentName = studentData.name;
            }
          }

          if (!studentEmail) {
            console.log("Student email not found for:", after.studentId);
            return null;
          }

          // Get exam details
          const examId = after.currentExam || after.examId;
          let examName = "Unknown Exam";
          let courseName = "Unknown Course";

          if (examId) {
            const examDoc = await db.collection("exams").doc(examId).get();
            if (examDoc.exists) {
              const examData = examDoc.data();
              examName = examData.examName || examData.title || examId;

              if (examData.courseCode) {
                const courseDoc = await db.collection("courses")
                    .doc(examData.courseCode).get();
                if (courseDoc.exists) {
                  courseName = courseDoc.data().courseName ||
                      examData.courseCode;
                }
              }
            }
          }

          // Format times
          const checkInTime = formatTime(after.checkInTime,
              after.checkInEpochTime);
          const checkOutTime = formatTime(after.checkOutTime,
              after.checkOutEpochTime);

          // Send email
          await sendCheckoutEmail({
            email: studentEmail,
            studentName: studentName,
            examName: examName,
            courseName: courseName,
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            examRoom: after.examRoom || "N/A",
            deviceName: after.deviceName || after.deviceId || "N/A",
          });

          // Update attendance record to mark email as sent
          await event.data.after.ref.update({
            emailSent: true,
            emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log("Checkout email sent successfully to:", studentEmail);
        } catch (error) {
          console.error("Error sending checkout email:", error);

          // Mark email as failed
          await event.data.after.ref.update({
            emailSent: false,
            emailError: error.message,
            emailErrorAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      return null;
    });

// Helper function to format time
// eslint-disable-next-line require-jsdoc
function formatTime(timeStr, epochTime) {
  if (epochTime) {
    return new Date(epochTime * 1000).toLocaleString("en-US", {
      timeZone: "Africa/Accra",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (timeStr) {
    if (timeStr.includes("T")) {
      return new Date(timeStr).toLocaleString("en-US", {
        timeZone: "Africa/Accra",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return timeStr; // Return as-is if it"s just time
    }
  }
  return "N/A";
}

// Helper function to send checkout email
// eslint-disable-next-line require-jsdoc
async function sendCheckoutEmail(data) {
  const mailOptions = {
    from: process.env.REACT_APP_EMAIL_SENDER_USERNAME,
    to: data.email,
    subject: `Exam Checkout Confirmation - ${data.courseName}`,
    html: `
      <div style="font-family: Arial, 
      sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Exam Checkout Confirmation</h2>
        
        <p>Dear ${data.studentName},</p>
        
        <p>This email confirms that you have successfully 
        checked out of your exam.</p>
        
        <div style="background-color: #f8f9fa; 
        padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">Exam Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Course:</strong> ${data.courseName}</li>
            <li><strong>Exam:</strong> ${data.examName}</li>
            <li><strong>Room:</strong> ${data.examRoom}</li>
            <li><strong>Check-in Time:</strong> ${data.checkInTime}</li>
            <li><strong>Check-out Time:</strong> ${data.checkOutTime}</li>
            <li><strong>Device:</strong> ${data.deviceName}</li>
          </ul>
        </div>
        
        <p>If you have any questions or concerns about your attendance 
        record, please contact your instructor or the examination office.</p>
        
        <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
          This is an automated message from the Attendance Management 
          System. Please do not reply to this email.
        </p>
      </div>
    `,
    text: `
      Exam Checkout Confirmation
      
      Dear ${data.studentName},
      
      This email confirms that you have successfully checked out of your exam.
      
      Exam Details:
      - Course: ${data.courseName}
      - Exam: ${data.examName}
      - Room: ${data.examRoom}
      - Check-in Time: ${data.checkInTime}
      - Check-out Time: ${data.checkOutTime}
      - Device: ${data.deviceName}
      
      If you have any questions or concerns about your attendance 
      record, please contact your instructor or the examination office.
      
      This is an automated message from the Attendance Management System.
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
}

// Manual email function (keep existing for testing)
const cors = require("cors")({origin: true});

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

  console.log(
      "from sendEmail function. The request object is:",
      JSON.stringify(req.body),
  );

  cors(req, res, async () => {
    const email = req.body.data.email;
    const name = req.body.data.name;
    const message = req.body.data.message;

    const mailOptions = {
      from: process.env.REACT_APP_EMAIL_SENDER_USERNAME,
      to: email,
      subject: "New message from Attendance System",
      text: `Attendance: ${name}\n${message}`,
    };

    try {
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
