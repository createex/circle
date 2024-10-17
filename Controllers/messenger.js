// sendMessage controller
const messageModel = require('../Models/message');
const { messageSchema } = require('../Schemas/message');
const { sendMessageToCircle, sendMessageToChatList } = require('../Socket/socketMethods');
const circleModel = require('../Models/circle');
const convosModel = require('../Models/convos');


/**
 *@description Send a message to a circle
 *@route POST /api/messenger/send
 *@access Private
 */

module.exports.sendMessage = async (req, res) => {
    try {
        const { error } = messageSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const sender = req.user._id;
        const { circleId } = req.body;

        // Check if the circle exists
        const circle = await circleModel.findById(circleId);
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        //check if the user is the member of the circle
        if (!circle.members.includes(sender)) {
            return res.status(403).json({ message: 'You are not authorized to send message to this circle' });
        }

        const message = new messageModel({ ...req.body, sender });
        const savedMessage = await message.save();

        // Emit the message to the circle
        handleNewMessage(circleId, savedMessage);

        res.status(201).json({ message: 'Message sent successfully', data: savedMessage });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @description Get all messages in a circle
 * @route GET /api/messenger/get/:circleId
 * @access Private
 */

module.exports.getMessages = async (req, res) => {
    try {
        const { circleId } = req.params;
        const page = parseInt(req.query.page) || 1;  // Default to first page
        const limit = parseInt(req.query.limit) || 10;  // Default limit to 10 messages per page
        const skip = (page - 1) * limit;

        // Check if the circle exists and if the user is a member of the circle
        const circle = await circleModel.findById(circleId);
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        if (!circle.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'You are not authorized to view messages in this circle' });
        }

        // Fetch messages and conditionally populate plan details if the type is 'plan'
        const messages = await messageModel.find({ circleId: circleId })
            .populate('sender', 'name profilePicture _id')
            .populate({
                path: 'planId',
                populate: [{ path: 'eventType' }, { path: 'members', select: 'name email profilePicture _id' }]
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        // Count total messages for pagination metadata
        const totalMessages = await messageModel.countDocuments({ circleId: circleId });

        // Map over messages to customize the output, including plan details if type is 'plan'
        const result = messages.map(message => {
            const messageData = {
                id: message._id,
                type: message.type,
                senderId: message.sender._id,
                text: message.message,
                senderName: message.sender.name,
                senderProfilePicture: message.sender.profilePicture,
                sentAt: message.createdAt,
                media: message.media.map(m => ({
                    type: m.type,
                    url: m.url,
                    mimetype: m.mimetype
                }))
            };

            if (message.type === 'plan' && message.planId) {
                messageData.planDetails = {
                    planId: message.planId._id,
                    name: message.planId.name,
                    description: message.planId.description,
                    date: message.planId.date,
                    location: message.planId.location,
                    eventType: message.planId.eventType,
                    members: message.planId.members,
                    budget: message.planId.budget,
                    createdBy: message.planId.createdBy
                };
            }

            return messageData;
        });

        // Return the response including the circleId
        res.status(200).json({
            success: true,
            data: result,
            circleId: circleId,  // Include circleId in the response
            pagination: {
                total: totalMessages,
                pages: Math.ceil(totalMessages / limit),
                currentPage: page
            }
        });
    } catch (error) {
        console.error('Failed to retrieve messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve messages'
        });
    }
};

/**
 * @description get the conversations of a user (all circles)
 * @route GET /api/messenger/conversations
 * @access Private
 */

module.exports.getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all circles where the user is a member
        const circles = await circleModel.find({ members: userId });

        // Get the latest message in each circle
        const conversations = await Promise.all(circles.map(async circle => {
            const latestMessage = await messageModel.findOne({ circleId: circle._id })
                .sort({ createdAt: -1 })
                .populate({
                    path: 'sender',
                    select: 'name profilePicture _id'
                })
                .exec();

            return {
                circleId: circle._id,
                circleName: circle.circleName,
                circleImage: circle.circleImage,
                latestMessage: latestMessage ? {
                    senderId: latestMessage.sender._id,
                    senderName: latestMessage.sender.name,
                    senderProfilePicture: latestMessage.sender.profilePicture,
                    text: latestMessage.message,
                    sentAt: latestMessage.createdAt
                } : null
            };
        }));

        res.status(200).json({
            success: true,
            data: conversations
        });
    } catch (error) {
        console.error('Failed to retrieve conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve conversations'
        });
    }
}


/**
 * @description Pin a message in a circle (to convos) - only the circle owner can pin a message
 * @route POST /api/messenger/pin/:circleId/:messageId
 * @access Private
 */

module.exports.pinMessage = async (req, res) => {
    try {
        const { circleId, messageId } = req.params;

        // Fetch the circle to check existence and ownership
        const circle = await circleModel.findById(circleId).populate('convos');
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        // Authorization check
        if (!circle.owner.equals(req.user._id)) {
            return res.status(403).json({ error: 'You are not authorized to pin messages' });
        }

        // Fetch the message to be pinned
        const message = await messageModel.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Fetch the convo document or create if it doesn't exist
        let convos = circle.convos;
        convos = await convosModel.findById(convos._id);

        // Check if the message is already pinned
        if (convos.pinnedMessages.includes(messageId)) {
            return res.status(400).json({ message: 'Message is already pinned' });
        }

        // Add the message to the pinned messages
        convos.pinnedMessages.push(messageId);
        await convos.save();

        res.status(200).json({ message: 'Message pinned successfully' });
    } catch (error) {
        console.error('Failed to pin message:', error);
        res.status(500).json({ message: 'Failed to pin message' });
    }
};


/**
 * @description get all pinned messages in a circle
 * @route GET /api/messenger/pinned/:circleId
 * @access Private
 */

module.exports.getPinnedMessages = async (req, res) => {
    try {
        const { circleId } = req.params;

        // Check if the circle exists
        const circle = await circleModel.findById(circleId).populate('members');
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        // Check if the user is a member of the circle
        if (!circle.members.some(member => member._id.equals(req.user._id))) {
            return res.status(403).json({ message: 'You are not authorized to view pinned messages in this circle' });
        }

        // Populate the Convos document to access pinnedMessages
        if (!circle.convos) {
            return res.status(404).json({ message: 'No pinned messages found' });
        }
        const convos = await convosModel.findById(circle.convos);

     
        const pinnedMessages = await messageModel.find({ _id: { $in: convos.pinnedMessages } })
            .populate({
                path: 'sender',
                select: 'name profilePicture _id'
            })
            .exec();

        const result = pinnedMessages.map(message => ({
            id: message._id,
            senderId: message.sender._id,
            text: message.message,
            senderName: message.sender.name,
            senderProfilePicture: message.sender.profilePicture,
            sentAt: message.createdAt,
            media: message.media.map(m => ({
                type: m.type,
                url: m.url,
                mimetype: m.mimetype
            }))
        }));

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Failed to retrieve pinned messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve pinned messages'
        });
    }
};


const handleNewMessage = async (circleId, messageData) => {
    const message = await messageModel.create(messageData);

    // Prepare the last message summary for chat list
    let lastMessageData;
    if (message.type === 'text') {
        lastMessageData = { message: message.message, type: 'text', time: message.createdAt };
    } else {
        lastMessageData = { message: message.type, type: message.type, time: message.createdAt }; // Show type for media
    }

    // Emit new message for chat list
    sendMessageToChatList(circleId, lastMessageData);

    // Prepare message for chat details
    const messageInDetail = {
        circleId,
        message: message.type === 'text' ? message.message : message.media[0].url,
        type: message.type,
        time: message.createdAt
    };

    // Emit new message for chat details
    sendMessageToCircle(circleId, messageInDetail);
};
