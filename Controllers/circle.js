const circleModel = require('../Models/circle');
const { circleSchema } = require('../Schemas/circle');
const userModel = require('../Models/user');
const { invite } = require('../Utils/invite');
const { uploadImage } = require('../Utils/upload');
const convosModel = require('../Models/convos');

/**
 * @description Create a new circle
 * @route POST /circle/create
 * @access Private
 */

module.exports.createCircle = async (req, res) => {
  const { error } = circleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { circleName, circleImage, description, type, interest, memberIds, phoneNumbers } = req.body;
  const ownerId = req.user._id;

  try {
    // Ensure the owner is added as a member if not already included
    if (!memberIds.includes(ownerId)) {
      memberIds.push(ownerId);
    }

    const circle = new circleModel({
      circleName,
      circleImage,
      description,
      type,
      interest,
      members: memberIds,
      owner: ownerId,
    });

    // Handle invitations and addition of users via phone number
    const invitePromises = phoneNumbers.map(async (phoneNumber) => {
      let user = await userModel.findOne({ phoneNumber });
      if (!user) {
        // Create a new user if not found
        user = new userModel({ phoneNumber });
        await user.save();
      }
      // Add user to the circle members array
      if (!circle.members.includes(user._id)) {
        circle.members.push(user._id);
      }

      // Construct and send the invitation link
      const inviteLink = `https://app.com/register?phone=${phoneNumber}`;
      const message = `${req.user.name} has invited you to join the circle on App. Register here: ${inviteLink}`;
      await invite([phoneNumber], message);
    });

    // Execute all invite operations
    await Promise.all(invitePromises);

    //now create the convos and add to the circle with empty pinned messages
    const convos = new convosModel({ pinnedMessages: [] }); 
    await convos.save();
    circle.convos = convos._id;

    // Save the circle to the database
    await circle.save();

    // Update all members to include this circle in their memberGroups
    await userModel.updateMany(
      { _id: { $in: circle.members } },
      { $addToSet: { memberGroups: circle._id } }
    );

    // Update the owner's ownedGroups separately
    await userModel.findByIdAndUpdate(ownerId, { $addToSet: { ownedGroups: circle._id } });




    res.status(201).json({
      success: true,
      message: 'Circle created successfully, and invitations sent.',
      circle,
    });
  } catch (error) {
    console.error('Error creating circle:', error);
    res.status(500).json({ error: 'Failed to create circle' });
  }
};

/**
 * @description Get the members of a circle
 * @route GET /circle/members/:circleId
 * @access Private
 */

module.exports.getCircleMembers = async (req, res) => {

  const circleId = req.params.circleId;
  if (!circleId) {
    return res.status(400).json({ error: 'Circle ID is required' });
  }

  try {
    const circle = await circleModel.findById(circleId).populate('members', 'name phoneNumber _id profilePicture');
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Circle members retrieved successfully',
      members: circle.members,
    });

  } catch (error) {
    console.error('Error getting circle members:', error);
    res.status(500).json({ error: 'Failed to get circle members' });
  }
}

/**
 * @description Get all circles (image, name, description and id only. Also sort by most recent)
 * @route GET /circle/all
 * @access Private
 */

module.exports.getAllCircles = async (req, res) => {
  try {
    const circles = await circleModel.find({}, 'circleName circleImage description').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: 'Circles retrieved successfully',
      circles,
    });
  } catch (error) {
    console.error('Error getting circles:', error);
    res.status(500).json({ error: 'Failed to get circles' });
  }
}

/**
 * @description upload cricle image 
 * @route POST /circle/upload-image
 * @access Private
 */

module.exports.updateCirlceImage = async (req, res) => {
  try {
    // Upload the image to Azure Blob Storage
    const image = await uploadImage('circle', req.file);
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

