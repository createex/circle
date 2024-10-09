const circleModel = require('../Models/circle');
const { circleSchema } = require('../Schemas/circle');
const userModel = require('../Models/user');
const { invite } = require('../Utils/invite');
const { uploadImage } = require('../Utils/upload');
const convosModel = require('../Models/convos');
const { eventTypeModel } = require('../Models/plan');
const mongoose = require('mongoose');
const Invites = require('../Models/invites'); // Assuming you have an invite model

/**
 * @description Create a new circle
 * @route POST /circle/create
 * @access Private
 */

const { inviteUser } = require('../Utils/sms'); // Assuming you have a function to send invites

module.exports.createCircle = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    console.log('Received request to create circle:', req.body);
    console.log('Requesting user ID:', req.user._id);

    // Validate the request payload
    const { error } = circleSchema.validate(req.body, { abortEarly: false });
    if (error) {
        console.error('Validation error:', error.details);
        return res.status(400).json({ error: error.message });
    }

    const { circleName, circleImage, description, type, interest, memberIds, phoneNumbers, interests } = req.body;
    const ownerId = req.user._id;

    try {
        console.log('Starting transaction for circle creation');

        // Ensure owner is part of the members list
        if (!memberIds.includes(ownerId.toString())) {
            memberIds.push(ownerId);
            console.log('Owner added to members:', ownerId);
        }

        // Create circle object
        const circle = new circleModel({
            circleName,
            circleImage,
            description,
            type,
            interest, // This is a single interest string
            members: memberIds,
            owner: ownerId,
            events: [],
        });

        console.log('Creating circle with details:', circle);

        // Process invites for the phone numbers
        const invitePromises = phoneNumbers.map(async (phoneNumber) => {
          console.log(`Processing invite for phone number: ${phoneNumber}`);
          
          let user = await userModel.findOne({ phoneNumber });
          if (!user) {
              user = new userModel({ phoneNumber });
              await user.save({ session });
              console.log(`New user created for phone number: ${phoneNumber}`);
          } else {
              console.log(`User already exists for phone number: ${phoneNumber}`);
          }
      
          // Check if the user is already a member of the circle
          if (!circle.members.includes(user._id)) {
              circle.members.push(user._id);
              console.log(`User added to circle members: ${user._id}`);
          } else {
              console.log(`User already a member of the circle: ${user._id}`);
          }
      
          // Create an invite for the user
          const invites = new Invites({
              phoneNumber,
              invitedBy: ownerId,
              circle: circle._id,
          });
          await invites.save({ session });
          console.log(`Invite created for ${phoneNumber} with invite ID: ${invites._id}`);
      
          // Send invitation message
          const inviteLink = `https://app.com/register?phone=${phoneNumber}`;
          const message = `${req.user.name} has invited you to join the circle on App. Register here: ${inviteLink}`;
          
          try {
              await invite([phoneNumber], message);
              console.log(`Invitation sent to ${phoneNumber}`);
          } catch (sendError) {
              console.error(`Failed to send invitation to ${phoneNumber}:`, sendError);
          }
        });
      

        await Promise.all(invitePromises);
        console.log('All invitations processed successfully');

        // Create a conversation for the circle
        const convos = new convosModel({ pinnedMessages: [] });
        await convos.save({ session });
        circle.convos = convos._id;
        console.log('Created new conversation for the circle');

        // Add event types (Hangout, Meeting, Trip Plan) to the circle
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
                console.log(`New event type created: ${eventType.name}`);
            } else {
                newEventType = existingEventType;
                console.log(`Existing event type found: ${eventType.name}`);
            }
            circle.events.push(newEventType._id);
        });

        await Promise.all(eventTypesPromises);
        await circle.save({ session });
        console.log('Circle saved successfully:', circle);

        // Update member groups for all users
        await userModel.updateMany(
            { _id: { $in: circle.members } },
            { $addToSet: { memberGroups: circle._id } },
            { session }
        );
        console.log('Updated user memberGroups for circle:', circle._id);

        // Update the owner's owned groups
        await userModel.findByIdAndUpdate(ownerId, { $addToSet: { ownedGroups: circle._id } }, { session });
        console.log('Updated owner with ownedGroups:', ownerId);

        // ** Update interests of the owner **
        if (interests && interests.length > 0) {
            await userModel.findByIdAndUpdate(ownerId, { $addToSet: { interests: { $each: interests } } }, { session });
            console.log(`Owner's interests updated with:`, interests);
        }

        await session.commitTransaction();
        session.endSession();
        console.log('Transaction committed successfully');
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
 * @description Add multiple members to a circle
 * @route POST /circle/add-members/:circleId
 * @access Private
 */

module.exports.addCircleMembers = async (req, res) => {
  const { circleId } = req.params;
  const { memberIds } = req.body;

  try {
    const circle = await circleModel.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    if (circle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the circle owner can add members' });
    }

    const newMembers = memberIds.filter(memberId => !circle.members.includes(memberId));
    circle.members.push(...newMembers);
    await circle.save();
    await userModel.updateMany(
      { _id: { $in: newMembers } },
      { $addToSet: { memberGroups: circleId } }
    );

    return res.status(200).json({
      success: true,
      message: 'Members added successfully',
    });

  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({ error: 'Failed to add members' });
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
    // Fetch the circle and populate the members' names and profile pictures
    const circle = await circleModel.findById(circleId)
      .populate({
        path: 'members',
        select: 'name profilePicture', // Specify the fields to populate
        model: 'User' // Ensure it populates from the User model
      })
      .populate({
        path: 'owner',
        select: 'name profilePicture', // Optionally populate the owner's name and profile picture
        model: 'User'
      });

    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    // Check if user is a member of the circle
    if (!circle.members.some(member => member._id.equals(req.user._id))) {
      return res.status(403).json({ error: 'You are not a member of this circle' });
    }

    res.status(200).json({
      success: true,
      message: 'Circle retrieved successfully',
      circle: {
        _id: circle._id,
        circleName: circle.circleName,
        circleImage: circle.circleImage,
        description: circle.description,
        type: circle.type,
        interest: circle.interest,
        members: circle.members, // This will now include names and profile pictures
        owner: {
          _id: circle.owner._id,
          name: circle.owner.name,
          profilePicture: circle.owner.profilePicture
        },
        todos: circle.todos,
        events: circle.events,
        convos: circle.convos,
        createdAt: circle.createdAt,
        updatedAt: circle.updatedAt
      }
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
  const { circleName, circleImage } = req.body; // Expecting circleImage in the request body

  try {
    const circle = await circleModel.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    // Check if the user is the owner of the circle
    if (circle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the circle owner can update the circle' });
    }

    // Update circle name and image URL
    circle.circleName = circleName;
    if (circleImage) {
      circle.circleImage = circleImage; // Update the profile picture URL if provided
    }

    await circle.save(); // Save the updated circle

    res.status(200).json({
      success: true,
      message: 'Circle updated successfully',
      circle,
    });
  } catch (error) {
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

