const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const {
  SESClient,
  SendTemplatedEmailCommand,
  CreateTemplateCommand,
  DeleteTemplateCommand,
} = require("@aws-sdk/client-ses");

// const sesClient = new SESClient({ region: process.env.AWSREGION });

const sesClient = new SESClient({
  region: process.env.AWSREGION,
  credentials: {
    accessKeyId: process.env.AWSACCESSKEYID,
    secretAccessKey: process.env.AWSSECRETACCESSKEY,
  },
});

// Function to create a template (already implemented)

//for creating template this is the paramemeter

//template for otp authentication

// const templateName = "OTPAuthentication";
// const subject = "SageTutle Verification";
// const htmlContent = `
//  <html lang="en">

// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>OTP Email</title>
// </head>

// <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f9f9f9;">
//     <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; 
//         box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
//         <div style="background-color: #f4e6ff; text-align: center; padding: 20px 0; border-bottom: 2px solid #e0d2f5;">
//             <img src="https://practice.sageturtle.in/uploads/sageturtle.svg" alt="Sage Turtle" style="height: 50px;">
//         </div>
//         <div style="padding: 20px; text-align: center; color: #333;">
//             <p style="margin: 0;">Hi,</p>
//             <h1 style="font-size: 18px; margin-bottom: 20px; color: #555;">To securely access your Sage Turtle account, 
//                 please use the following OTP</h1>
//             <div style="display: flex; justify-content: center; gap: 8px; margin: 20px 0;">
//                 <div style="width: fit-content; height: 40px; display: flex; align-items: center; 
//                     justify-content: center; border-radius: 4px; font-size: 20px; font-weight: bold; 
//                     background-color: #f9fff1; color: #4caf50; letter-spacing: 8px;">{{otp}}</div>
//             </div>
//             <p style="margin: 0;">This OTP is valid for 10 minutes and can only be used for logging into your account. 
//                 Please do not share it with anyone to ensure the security of your account.</p>
//             <div style="margin-top: 20px; font-size: 14px; color: #666; text-align: left; line-height: 1.6;">
//                 <p style="margin: 0;">If you didn’t request this login OTP, please contact us immediately at 
//                     <a href="mailto:support@sageturtle.in" style="color: #2E79F0; text-decoration: none;">support@sageturtle.in</a>.</p>
//                 <p style="margin: 0;">Contact: +91 - 9873020916</p>
//                 <p style="margin: 0;">Thank you for choosing Sage Turtle!</p>
//                 <p style="margin: 0;">Warm regards, <br> The Sage Turtle Team</p>
//             </div>
//         </div>
//     </div>
// </body>

// </html>
// `;

// const templateName="LoginWelcome"
// const subject="Welcome to SageTutle"
// const htmlContent=`
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Welcome to Sage Turtle</title>
// </head>
// <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
//     <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; 
//     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
//     <div style="background-color: #f4e6ff; text-align: center; padding: 20px 0; border-bottom: 2px solid #e0d2f5;">
//         <img src="https://practice.sageturtle.in/uploads/sageturtle.svg" alt="Sage Turtle" style="height: 50px;">
//     </div>
    
//     <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
//         <h1 style="color: #333333; text-align: center; font-size: 24px; margin-bottom: 20px;">Welcome to Sage Turtle</h1>
//         <p style="color: #555555; font-size: 16px; line-height: 1.6;">
//             We’re so glad you’ve joined our community. Sage Turtle is your trusted platform to connect with experienced psychologists and take the first step toward better mental well-being.
//         </p>
//         <div style="border: 1px solid #e0e0e0; padding: 0px 10px; background-color: rgba(251, 255, 242, 1);">
//             <h2 style="color: #333333;  font-size: 20px; margin-top: 20px; margin-bottom: 10px;">Here’s how to get started</h2>
//             <ul style="color: #555555; font-size: 16px; line-height: 1.6; padding-left: 20px;">
//                 <li>Log in to your account: <a href="https://covid-19-tracker-fc5dd.web.app/client" target="_blank" style="color: #007BFF; text-decoration: none;">[Login Link]</a></li>
//                 <li>Explore our list of expert psychologists.</li>
//                 <li>Book an appointment that fits your schedule.</li>
//             </ul>
//         </div>
        
//         <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-top: 20px;">
//             Your mental health matters, and we’re here to support you every step of the way.
//         </p>
//         <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-top: 20px;">
//             Need help? Feel free to reach out to us anytime at <a href="mailto:support@sageturtle.in" style="color: #007BFF; text-decoration: none;">support@sageturtle.in</a>.
//         </p>
//         <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-top: 20px;">
//             Contact: <a href="tel:+919873020916" style="color: #007BFF; text-decoration: none;">+91 - 9873020916</a>
//         </p>
//         <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-top: 20px;">
//             Together, let’s make wellness a priority.
//         </p>
//         <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-top: 20px; font-weight: bold;">
//             Warm regards,<br>
//             The Sage Turtle Team
//         </p>
//     </div>
// </div>
// </body>
// </html>
// `


// const templateName="BookAppointment"
// const subject="Appointment Confirmation"
// const htmlContent=`
//  <html lang="en">

// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Appointment Confirmation</title>
// </head>

// <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f9f9f9;">
//     <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; 
//         box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
        
//         <!-- Header Section -->
//         <div style="background-color: #f4e6ff; text-align: center; padding: 20px 0; border-bottom: 2px solid #e0d2f5;">
//             <img src="https://corportal.s3.ap-south-1.amazonaws.com/logo.svg" alt="Sage Turtle" style="height: 50px;">
//         </div>

//         <!-- Success Message -->
//         <div style="text-align: center; padding: 20px; color: #333;">
//             <img src="https://cdn-icons-png.flaticon.com/512/845/845646.png" alt="Success"
//                 style="width: 50px; height: 50px; margin-bottom: 10px;">
//             <h2 style="color: #333; font-size: 18px;">Hi, Your appointment has been successfully booked!</h2>
//             <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Here are the details of your session</p>

//             <!-- Appointment Details -->
//             <div style="background-color: rgba(251, 255, 242, 1); padding: 15px 40px; border-radius: 5px; border: 1px solid #e0e0e0; text-align: left;">
//                 <table style="width: 100%; border-collapse: collapse;">
//                     <tr>
//                         <td style="padding: 5px 0; font-size: 14px;"><strong>Psychologist:</strong> <span style="color: #5a4fd9;">{{TherapistName}}</span></td>
//                         <td style="padding: 5px 0; font-size: 14px;"><strong>Time:</strong> <span style="color: #5a4fd9;">{{AppointmentTime}}</span></td>
//                     </tr>
//                     <tr>
//                         <td style="padding: 5px 0; font-size: 14px;"><strong>Date:</strong> <span style="color: #5a4fd9;">{{AppointmentDate}}</span></td>
//                         <td style="padding: 5px 0; font-size: 14px;"><strong>Mode:</strong> <span style="color: #5a4fd9;">{{Mode}}</span></td>
//                     </tr>
//                 </table>
//             </div>

//             <!-- Instructions -->
//             <p style="margin-top: 20px; font-size: 14px; color: #666;">
//                 Please ensure you are available at the scheduled time. If you need to reschedule or have any questions, 
//                 feel free to reach out to us at 
//                 <a href="mailto:support@sageturtle.in" style="color: #5a4fd9; text-decoration: none;">support@sageturtle.in</a>.
//             </p>

//             <p style="font-size: 14px; color: #666;"><strong>Contact:</strong> <a href="tel:+919873020916" style="color: #5a4fd9; text-decoration: none;">+91 - 9873020916</a></p>

//             <!-- Next Steps -->
//             <h3 style="text-align: left; font-size: 16px; color: #333; margin-top: 20px;">Next Steps:</h3>
//             <ul style="text-align: left; font-size: 14px; color: #666; padding-left: 20px;">
//                 <li>Add this appointment to your calendar to stay organized.</li>
//                 <li>Prepare any questions or concerns you'd like to discuss during the session.</li>
//                 <li>Thank you for trusting Sage Turtle to support your journey to mental well-being.</li>
//             </ul>

//             <!-- Footer -->
//             <p style="font-size: 14px; color: #666; text-align: left;">Warm regards,</p>
//             <p style="font-size: 14px; color: #666; text-align: left;">The Sage Turtle Team</p>
//         </div>
//     </div>
// </body>

// </html>
// `

//template for meet link genration
// const templateName = 'MeetConnect';
// const subject = 'SageTutle Connect';
// const htmlContent = `
//   <html>
//     <head>
//       <style>
//         body {
//           font-family: Arial, sans-serif;
//           margin: 0;
//           padding: 0;
//           background-color: #f5f5f5;
//         }
//         .container {
//           max-width: 600px;
//           margin: 20px auto;
//           background-color: #ffffff;
//           border-radius: 8px;
//           box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
//           padding: 20px;
//         }
//         .header {
//           text-align: center;
//           margin-bottom: 20px;
//         }
//         .header h1 {
//           color: #007BFF;
//           font-size: 24px;
//           margin: 0;
//         }
//         .content {
//           font-size: 16px;
//           color: #333333;
//           line-height: 1.5;
//         }
//         .meeting-link {
//           background-color: #e0f7fa;
//           border: 1px solid #b2ebf2;
//           border-radius: 4px;
//           padding: 15px;
//           text-align: center;
//           margin-bottom: 20px;
//         }
//         .meeting-link a {
//           font-size: 16px;
//           color: #007BFF;
//           text-decoration: none;
//         }
//         .footer {
//           font-size: 14px;
//           color: #888888;
//           text-align: center;
//           margin-top: 20px;
//         }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <div class="header">
//           <h1>SageTutle Verification</h1>
//         </div>
//         <div class="content">
//           <p>Dear [Recipient Name],</p>
//           <p>Here is the link to your meeting with the therapist:</p>
//           <div class="meeting-link">
//             <p><a href="{{meetingLink}}" target="_blank">Join the Meeting</a></p>
//           </div>
//           <p>If you have any questions, feel free to reach out to us.</p>
//         </div>
//         <div class="footer">
//           <p>Please do not share this link with anyone. If you did not request this, please ignore this email.</p>
//         </div>
//       </div>
//     </body>
//   </html>
// `;

//this template is for payment link
// const templateName = 'SendPaymentLink';
// const subject = 'Complete Your Payment - SageTutle';
// const htmlContent = `
//   <html>
//     <head>
//       <style>
//         body {
//           font-family: Arial, sans-serif;
//           margin: 0;
//           padding: 0;
//           background-color: #f5f5f5;
//         }
//         .container {
//           max-width: 600px;
//           margin: 20px auto;
//           background-color: #ffffff;
//           border-radius: 8px;
//           box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
//           padding: 20px;
//         }
//         .header {
//           text-align: center;
//           margin-bottom: 20px;
//         }
//         .header h1 {
//           color: #007BFF;
//           font-size: 24px;
//           margin: 0;
//         }
//         .content {
//           font-size: 16px;
//           color: #333333;
//           line-height: 1.5;
//         }
//         .payment-link {
//           background-color: #e8f5e9;
//           border: 1px solid #c8e6c9;
//           border-radius: 4px;
//           padding: 15px;
//           text-align: center;
//           margin-bottom: 20px;
//         }
//         .payment-link a {
//           font-size: 18px;
//           color: #007BFF;
//           text-decoration: none;
//           font-weight: bold;
//         }
//         .footer {
//           font-size: 14px;
//           color: #888888;
//           text-align: center;
//           margin-top: 20px;
//         }
//         .expiration {
//           color: #d32f2f;
//           font-weight: bold;
//         }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <div class="header">
//           <h1>SageTutle Payment Link</h1>
//         </div>
//         <div class="content">
//           <p>Dear {{name}},</p>
//           <p>You have requested a payment for our services. Please complete the payment within the next <span class="expiration">20 minutes</span> to proceed.</p>
//           <div class="payment-link">
//             <p><a href="{{paymentLink}}" target="_blank">Click here to pay</a></p>
//           </div>
//           <p>If the link expires, you may request a new payment link.</p>
//         </div>
//         <div class="footer">
//           <p>If you have any questions, feel free to contact us.</p>
//           <p>Please do not share this link with anyone. If you did not request this payment, please ignore this email.</p>
//         </div>
//       </div>
//     </body>
//   </html>
// `;

//this template for user login credentials
// const templateName = "AddUser";
// const subject = "Welcome to SageTutle - Your Login Credentials";
// const htmlContent = `
//   <html>
//     <head>
//       <style>
//         body {
//           font-family: Arial, sans-serif;
//           margin: 0;
//           padding: 0;
//           background-color: #f5f5f5;
//         }
//         .container {
//           max-width: 600px;
//           margin: 20px auto;
//           background-color: #ffffff;
//           border-radius: 8px;
//           box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
//           padding: 20px;
//         }
//         .header {
//           text-align: center;
//           margin-bottom: 20px;
//         }
//         .header h1 {
//           color: #007BFF;
//           font-size: 24px;
//           margin: 0;
//         }
//         .content {
//           font-size: 16px;
//           color: #333333;
//           line-height: 1.5;
//         }
//         .login-link {
//           background-color: #e8f5e9;
//           border: 1px solid #c8e6c9;
//           border-radius: 4px;
//           padding: 15px;
//           text-align: center;
//           margin-bottom: 20px;
//         }
//         .login-link a {
//           font-size: 18px;
//           color: #007BFF;
//           text-decoration: none;
//           font-weight: bold;
//         }
//         .footer {
//           font-size: 14px;
//           color: #888888;
//           text-align: center;
//           margin-top: 20px;
//         }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <div class="header">
//           <h1>Welcome to SageTutle</h1>
//         </div>
//         <div class="content">
//           <p>Dear User,</p>
//           <p>Your account has been created successfully. You can use the following credentials to log in:</p>
//           <ul>
//             <li>Email: <strong>{{email}}</strong></li>
//             <li>Phone: <strong>{{phone}}</strong></li>
//           </ul>
//           <p>To log in, please click the link below:</p>
//           <div class="login-link">
//             <p><a href="{{websiteLink}}" target="_blank">Go to SageTutle Login</a></p>
//           </div>
//           <p>If you have any questions, feel free to reach out to our support team.</p>
//         </div>
//         <div class="footer">
//           <p>Please do not share this email with anyone. If you did not request this account, please contact support immediately.</p>
//         </div>
//       </div>
//     </body>
//   </html>
// `;

const createTemplate = async (templateName, subject, htmlContent) => {
  const params = {
    Template: {
      TemplateName: templateName,
      SubjectPart: subject,
      HtmlPart: htmlContent,
    },
  };

  try {
    const data = await sesClient.send(new CreateTemplateCommand(params));
    console.log("Template created successfully", data);
  } catch (error) {
    console.error("Error creating template", error);
  }
};

// code for deleting existing tmeplate in ses

const deleteTemplate = async (templateName) => {
  const params = {
    TemplateName: templateName, // Name of the template you want to delete
  };

  try {
    const data = await sesClient.send(new DeleteTemplateCommand(params));
    console.log("Template deleted successfully", data);
  } catch (error) {
    console.error("Error deleting template", error);
  }
};

// Function to send an email using the template
const sendTemplatedEmail = async (
  destinationAddresses,
  templateName,
  templateData
) => {
  const params = {
    Source: process.env.VERIFIEDEMAIL, // Source email address
    Destination: {
      ToAddresses: destinationAddresses, // Recipient email addresses
    },
    Template: templateName, // Template name
    TemplateData: JSON.stringify(templateData), // Data to replace placeholders in the template
  };

  try {
    const data = await sesClient.send(new SendTemplatedEmailCommand(params));
    console.log("Email sent successfully", data);
  } catch (error) {
    console.error("Error sending email", error);
  }
};

//this is how all the method like creaiting,deleleting and sending email with template

const otp = 123456;

//this templated data is for opt
// const templateData = {
//   otp: otp.toString(),
// };
const templateData={
  TherapistName:"Dr. John Doe",
  AppointmentTime:"10:00 AM",
  AppointmentDate:"2021-11-30",
  Mode:"Online"
}

// this template data is for payment link
// const templateData = {
//   name: "John Doe",
//   paymentLink: "https://razorpay.com/payment-link/abcd1234",
// };

// this templateData is for user credentials
// const templateData = {
//   email: "khanmdadil094@gmail.com",
//   phone: "9122672984",
//   websiteLink: "https://covid-19-tracker-fc5dd.web.app/client",
// };

// createTemplate(templateName, subject, htmlContent);
// deleteTemplate(templateName);

// email should always be in array
// sendTemplatedEmail(["mdadilakhtar8@gmail.com"],templateName,templateData)

module.exports = { createTemplate, sendTemplatedEmail, deleteTemplate };
