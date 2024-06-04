const itineraryModel = require('../Models/itinerary');
const userModel = require('../Models/user');

/**
 * @description Create a new itinerary for a user
 * @route POST /itinerary/create
 * @access Private
 */

module.exports.createItinerary = async (req, res) => {
    const { name, about, date, time } = req.body;
    if(!name || !date || !time || !about) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }
    
    try {
        const itinerary = new itineraryModel({
        name,
        about,
        date,
        time,
        });
    
        await itinerary.save();
    
        // Add the itinerary to the user's itinerary list
        req.user.itineraries.push(itinerary._id);
        await req.user.save();
    
        res.status(201).json({ message: 'Itinerary created successfully', itinerary });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
    
}

/**
 * @description Get itineraries for a user based upon the Date
 * @route GET /itinerary/get?date=YYYY-MM-DD
 * @access Private
 */

module.exports.getItineraries = async (req, res) => {
    const  date = req.query.date;
    const userId = req.user._id;
    console.log(date);

    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const userWithItineraries = await userModel.findById(userId)
            .populate({
                path: 'itineraries',
                match: { date: { $gte: startOfDay, $lte: endOfDay } }
            })
            .exec();

        if (!userWithItineraries) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(userWithItineraries.itineraries);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error", error });
    }
}