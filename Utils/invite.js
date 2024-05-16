const { sendInviteLinks } = require('./sms');
module.exports.invite = async (phoneNumbers, message) => {
    try {
      await sendInviteLinks(phoneNumbers, message);
    } catch (error) {
      console.error('Error sending invitations:', error);
      throw error; 
    }
  };
  

