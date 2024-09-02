const storyModel = require('../Models/stories');
const circleModel = require('../Models/circle');
const userModel = require('../Models/user');
const mongoose = require('mongoose');


/**
 * @description Create a new story
 * @route POST /story/create/:circleId
 * @access Private
 */

module.exports.createStory = async (req, res) => {
    const { circleId } = req.params;
    const {mediaUrl, mediaType, text } = req.body;
    if(!mediaUrl || !mediaType || !circleId){
        return res.status(400).json({ message: 'Media URL, circle id and type are required' });
    }
    const userId = req.user._id;

    // Validate the media type
    if (!['image', 'video'].includes(mediaType)) {
        return res.status(400).json({ message: 'Invalid media type provided' });
    }

    // Check if the circle exists and if the user is a member of the circle
    try {
        const circle = await circleModel.findById(circleId);
        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        // Optionally check if the user is a member of the circle
        if (!circle.members.includes(userId)) {
            return res.status(403).json({ message: 'You are not authorized to add stories to this circle' });
        }

        // Create the story
        const newStory = new storyModel({
            createdBy: userId,
            circle: circle._id,
            text: text,
            media: {
                url: mediaUrl,
                type: mediaType
            }
        });

        await newStory.save();

        res.status(201).json({
            message: 'Story created successfully',
        });
    } catch (error) {
        console.error('Error creating story:', error);
        res.status(500).json({ message: 'Failed to create story', error: error.toString() });
    }
};


/**
 * @description Get active stories for a specified circle
 * @route GET /story/:circleId
 * @access Private
 */


module.exports.getStoriesForCircle = async (req, res) => {
    const { circleId } = req.params;

    try {
        // Fetch stories that are still active and belong to the specified circle
        const stories = await storyModel.find({
            circle: circleId,
            expiresAt: { $gt: new Date() }  // Filters out expired stories
        })
        .populate({
            path: 'createdBy',
            select: 'name profilePicture _id'
        })
        .sort({ createdAt: -1 })  // Sorts stories by creation time, most recent first
        .exec();

        // Group stories by user
        const userStories = {};
        stories.forEach(story => {
            const userId = story.createdBy._id.toString();
            if (!userStories[userId]) {
                userStories[userId] = {
                    user: {
                        id: userId,
                        name: story.createdBy.name,
                        profilePicture: story.createdBy.profilePicture,
                    },
                    stories: []
                };
            }
            userStories[userId].stories.push({
                id: story._id,
                mediaUrl: story.media.url,
                mediaType: story.media.type,
                text: story.text,
                createdAt: story.createdAt
            });
        });

        // Convert the userStories object into an array format suitable for response
        const result = Object.values(userStories);

        // Prepare the response data including users' information
        const responseData = result.map(userStory => ({
            user: userStory.user, // User information
            stories: userStory.stories // Associated stories
        }));

        res.status(200).json({
            message: 'Stories retrieved successfully',
            data: responseData
        });
    } catch (error) {
        console.error('Error retrieving stories:', error);
        res.status(500).json({ message: 'Failed to retrieve stories', error: error.toString() });
    }
};