const circleModel = require('../Models/circle');
const { circleSchema } = require('../Schemas/circle');
const userModel = require('../Models/user');
const { invite } = require('../Utils/invite');
const { uploadImage } = require('../Utils/upload');

/**
 * @description Create a new circle
 * @route POST /circle/create
 * @access Private
 */

module.exports.createCircle = async (req, res) => {
  try {
    const { error } = circleSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    const { circleName, circleImage, description, type, interest, memberIds, phoneNumbers } = req.body;
    const ownerId = req.user._id;

    // Create a new Circle
    const circle = new circleModel({
      circleName,
      circleImage,
      description,
      type,
      interest,
      members: memberIds,
      owner: ownerId,
    });


    // Handle phone numbers for non-members
    for (const phoneNumber of phoneNumbers) {
      let user = await userModel.findOne({ phoneNumber });

      if (!user) {
        // Create a new user with only the phone number
        user = new userModel({ phoneNumber });
        await user.save();

      }


      // Add the new user to the circle members
      circle.members.push(user._id);

      // Construct the invitation link
      const inviteLink = `https://app.com/register?phone=${phoneNumber}`;

      // Send the invitation link via SMS
      const message = `${req.user.phoneNumber} has invited you to join the App. Click on the link to join: ${inviteLink}`;
      try {
        await invite([phoneNumber], message);
      } catch (error) {
        console.error('Failed to send invite:', error);
        return res.status(500).json({ error: 'Failed to send invite' });
      }
    }

    // Save the Circle to the database
    await circle.save();

    res.status(201).json({
      success: true,
      message: 'Circle created and invitations sent successfully',
      circle,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/**
 * @description upload cricle image 
 * @route POST /circle/upload-image
 * @access Private
 */

module.exports.updateCirlceImage = async (req, res) => {
  try {
    // Upload the image to Azure Blob Storage
    const image = await uploadImage('circle-image', req.file);
    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: image,
    });
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
}

