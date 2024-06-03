// sendMessage controller
const messageModel = require('../Models/message');
const { messageSchema } = require('../Schemas/message');
const { sendMessageToCircle } = require('../Socket/socketMethods');
const circleModel = require('../Models/circle');


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
        sendMessageToCircle(circleId, savedMessage);

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

        const messages = await messageModel.find({ circleId: circleId })
            .populate({
                path: 'sender',
                select: 'name profilePicture _id'  // Only fetch the name and profile picture from the User collection
            })
            .sort({ createdAt: -1 })  // Sorting messages by creation time, newest first
            .skip(skip)
            .limit(limit)
            .exec();

        // Count total messages for pagination metadata
        const totalMessages = await messageModel.countDocuments({ circleId: circleId });

        // Map over messages to customize the output, including media details
        const result = messages.map(message => ({
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
            data: result,
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

