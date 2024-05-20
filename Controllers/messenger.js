// sendMessage controller
const messageModel = require('../Models/message');
const { messageSchema } = require('../Schemas/message');
const { sendMessageToCircle } = require('../Socket/socketMethods');
const circleModel = require('../Models/circle');

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
