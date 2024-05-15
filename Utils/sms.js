const twilio = require('twilio');

// Initialize Twilio client
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

module.exports.sendVerificationSMS = async (phoneNumber, code) => {
  try {
    const message = await client.messages.create({
      body: `Thank you for choosing us. Use the following OTP to complete your Sign Up procedures: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER, 
      to: phoneNumber
    });

    console.log(message.sid);
  } catch (error) {
    console.error(error);
  }
};

module.exports.sendInviteLinks = async (phoneNumbers, message) => {
  try {
    const promises = phoneNumbers.map(async (phoneNumber) => {
      const msg = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER, 
        to: phoneNumber
      });

      console.log(`Message sent to ${phoneNumber}: ${msg.sid}`);
    });

    await Promise.all(promises);
    console.log('All messages sent successfully');
  } catch (error) {
    console.error('Error sending messages:', error);
  }
};
