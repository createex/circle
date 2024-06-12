const circleModel = require('../Models/circle');
const { circleSchema } = require('../Schemas/circle');
const userModel = require('../Models/user');
const { invite } = require('../Utils/invite');
const { uploadImage } = require('../Utils/upload');
const convosModel = require('../Models/convos');
const { eventTypeModel } = require('../Models/plan');
const mongoose = require('mongoose');

/**
 * @description Create a new circle
 * @route POST /circle/create
 * @access Private
 */

module.exports.createCircle = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
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
        await user.save({ session });
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

    await Promise.all(invitePromises);

    //now create the convos and add to the circle with empty pinned messages
    const convos = new convosModel({ pinnedMessages: [] });
    await convos.save({ session });
    circle.convos = convos._id;

    //create default event types for the circle ("Hangout - green", "Meeting - orange", "Trip Plan - blue")
    const eventTypes = [
      { name: "Hangout", color: "green" },
      { name: "Meeting", color: "orange" },
      { name: "Trip Plan", color: "blue" },
    ];

    const eventTypesPromises = eventTypes.map(async (eventType) => {
      let existingEventType = await eventTypeModel.findOne({ name: eventType.name, color: eventType.color });
      let newEventType;
      if (!existingEventType) {
        newEventType = new eventTypeModel(eventType);
        await newEventType.save({ session });
      } else {
        newEventType = existingEventType;
      }
      // Add the event type to the circle
      circle.events.push(newEventType._id);
    });

    await Promise.all(eventTypesPromises);
    await circle.save({ session }); // Save the circle after all event types have been handled

    await userModel.updateMany(
      { _id: { $in: circle.members } },
      { $addToSet: { memberGroups: circle._id } },
      { session }
    );

    await userModel.findByIdAndUpdate(ownerId, { $addToSet: { ownedGroups: circle._id } }, { session });

    await session.commitTransaction();
    session.endSession();
    return res.status(201).json({
      success: true,
      message: 'Circle created successfully, and invitations sent.',
      circle,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
 * @description Add a members to a circle
 * @route POST /circle/add-member/:circleId
 * @access Private
 */

module.exports.addCircleMember = async (req, res) => {
  const { circleId } = req.params;
  const { memberId } = req.body;

  try {
    const circle = await circleModel.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    if (circle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the circle owner can add members' });
    }

    if (circle.members.includes(memberId)) {
      return res.status(400).json({ error: 'Member is already part of the circle' });
    }

    circle.members.push(memberId);
    await circle.save();
    await userModel.findByIdAndUpdate(memberId, { $addToSet: { memberGroups: circleId } });

    return res.status(200).json({
      success: true,
      message: 'Member added successfully',
    });

  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
}


/**
 * @description Remove a member from a circle
 * @route DELETE /circle/remove-member/:circleId/:memberId
 * @access Private
 */

module.exports.removeCircleMember = async (req, res) => {
  const { circleId, memberId } = req.params;

  try {
    const circle = await circleModel.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    if (circle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the circle owner can remove members' });
    }

    if (memberId === circle.owner.toString()) {
      return res.status(400).json({ error: 'Owner cannot be removed from the circle' });
    }
    
    if (circle.members.includes(memberId)) {
      circle.members.pull(memberId);
      await circle.save();
      await userModel.findByIdAndUpdate(memberId, { $pull: { memberGroups: circleId } });
      
      return res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });

    } else {
      return res.status(404).json({ error: 'Member not part of the circle' });
    }

  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}


/**
 * @description Get all circles (in which user is member) (image, name, description and id only. Also sort by most recent)
 * @route GET /circle/all
 * @access Private
 */



module.exports.getAllCircles = async (req, res) => {

  try {
    const circles = await circleModel.find({ members: req.user._id })
      .select('circleName circleImage description')
      .sort({ createdAt: -1 });

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
 * @description Get a circle by ID
 * @route GET /circle/:circleId
 * @access Private
 */

module.exports.getCircleById = async (req, res) => {
  const circleId = req.params.circleId;

  try {
    const circle = await circleModel.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    //check if user is a member of the circle
    if (!circle.members.includes(req.user._id)) {
      return res.status(403).json({ error: 'You are not a member of this circle' });
    }

    res.status(200).json({
      success: true,
      message: 'Circle retrieved successfully',
      circle,
    });
  } catch (error) {
    console.error('Error getting circle:', error);
    res.status(500).json({ error: 'Failed to get circle' });
  }
}

/**
 * @description Update a circl by ID (name only)
 * @route PUT /circle/:circleId
 * @access Private
 */

module.exports.updateCircle = async (req, res) => {
  const circleId = req.params.circleId;
  const { circleName } = req.body;

  try {
    const circle = await circleModel.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    if (circle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the circle owner can update the circle' });
    }

    circle.circleName = circleName;
    await circle.save();
    
    res.status(200).json({
      success: true,
      message: 'Circle updated successfully',
      circle,
    });
  }
  catch (error) {
    console.error('Error updating circle:', error);
    res.status(500).json({ error: 'Failed to update circle' });
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

