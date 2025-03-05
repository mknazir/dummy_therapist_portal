require('dotenv').config({ path: '../.env' });
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');



  const snsClient = new SNSClient({
    region: process.env.AWSREGION,
    credentials: {
      accessKeyId: process.env.AWSACCESSKEYID,
      secretAccessKey: process.env.AWSSECRETACCESSKEY,
    },
  });



  const sendSMS = async (phoneNumber, message) => {
    const params = {
      Message: message, // The message you want to send
      PhoneNumber: phoneNumber, // The phone number you want to send the message to (in E.164 format)
    };
  
    try {
      const data = await snsClient.send(new PublishCommand(params));
      console.log("Message sent successfully:", data);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const phoneNumber = '+917425884683'; // Replace with the target phone number
  const message = 'Your OTP is 312123. Please do not share it with anyone.';
  
  // sendSMS(phoneNumber, message);

module.exports={sendSMS}




//after Trai Approval



// const snsClient = new SNSClient({
//   region: process.env.AWSREGION,
//   credentials: {
//     accessKeyId: process.env.AWSACCESSKEYID,
//     secretAccessKey: process.env.AWSSECRETACCESSKEY,
//   },
// });

// const sendSMS = async (phoneNumber, message) => {
//   const params = {
//     Message: message, // SMS content
//     PhoneNumber: phoneNumber, // E.164 format (+91XXXXXXXXXX)
//     MessageAttributes: {
//       'AWS.SNS.SMS.SenderID': {
//         DataType: 'String',
//         StringValue: 'AWSOTP', // Replace with your TRAI-approved Sender ID
//       },
//       'AWS.SNS.SMS.SMSType': {
//         DataType: 'String',
//         StringValue: 'Transactional', // Use 'Transactional' for OTPs
//       },
//     },
//   };

//   try {
//     const data = await snsClient.send(new PublishCommand(params));
//     console.log('Message sent successfully:', data);
//   } catch (error) {
//     console.error('Error sending message:', error);
//   }
// };

// const phoneNumber = '+917425884683'; // Must be in E.164 format
// const message = 'Your OTP is 312123. Please do not share it with anyone.';

// sendSMS(phoneNumber, message);