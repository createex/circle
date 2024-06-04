const {planModel, eventTypeModel} = require('../Models/plan');
const circleModel = require('../Models/circle');



/**
 * @description Create a plan for a circle by the user  
 * @route POST /plan/create/:circleId
 * @access Private
 */

module.exports.createPlan = async (req, res) => {
    const { name, description, date, location, eventType } = req.body;
    const circleId = req.params.circleId;

    if(!name || !date || !location || !eventType || !circleId) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }
    try {
        const circle = await circleModel.findById(circleId);
        if(!circle) {
            return res.status(404).json({ error: 'Circle not found' });
        }

        //check if the event type exist in the circle
        if(!circle.events.includes(eventType)) {
            return res.status(400).json({ error: 'Event type does not exist in the circle' });
        }
        
        const plan = new planModel({
            name,
            description,
            date,
            location,
            eventType,
            createdBy: req.user._id
        });

        await plan.save();

        // Add the plan to the circle's plan list
        circle.plans.push(plan._id);
        await circle.save();

        res.status(201).json({ message: 'Plan created successfully', plan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * @description Get event types of a circle
 * @route GET /plan/event-types/:circleId
 * @access Private
 */

module.exports.getEventTypes = async (req, res) => {
    const circleId = req.params.circleId;
    if (!circleId) {
        return res.status(400).json({ error: 'Circle ID is required' });
    }

    try {
        const circle = await circleModel.findById(circleId).populate('events');
        if (!circle) {
            return res.status(404).json({ error: 'Circle not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Event types retrieved successfully',
            eventTypes: circle.events,
        });

    } catch (error) {
        console.error('Error getting event types:', error);
        res.status(500).json({ error: 'Failed to get event types' });
    }
}

/**
 * @description Create an event type for a circle and push it to the circle's event types list
 * @route POST /plan/event-types/create/:circleId
 * @access Private
 */

module.exports.createEventType = async (req, res) => {
    const { name, color } = req.body;
    const circleId = req.params.circleId;

    if(!name || !color || !circleId) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }

    try {
        const circle = await circleModel.findById(circleId);
        if(!circle) {
            return res.status(404).json({ error: 'Circle not found' });
        }

        /*
        check if the event type  and its corresponding color already exists if yes then just 
        add  the id to the circle otherwise create a new event type and add it to the circle
        */

        const existingEventType = await eventTypeModel.findOne({ name, color })
        let eventType;
        if (existingEventType) {
            eventType = existingEventType;
        } else {
            eventType = new eventTypeModel({ name, color });
            await eventType.save();
        }

        circle.events.push(eventType._id);
        await circle.save();
        
        res.status(201).json({ message: 'Event type created successfully', eventType });
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error('Error creating event type:', error);
    }
}

/**
 * @description Get plans for a circle (populated with event type)
 * @route GET /plan/get/:circleId
 * @access Private
 */

module.exports.getPlans = async (req, res) => {
    const circleId = req.params.circleId;
    if (!circleId) {
        return res.status(400).json({ error: 'Circle ID is required' });
    }

    try {
        const circle = await circleModel.findById(circleId).populate({
            path: 'plans',
            populate: {
                path: 'eventType',
                model: 'EventType'
            }
        });
        if (!circle) {
            return res.status(404).json({ error: 'Circle not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Plans retrieved successfully',
            plans: circle.plans,
        });

    } catch (error) {
        console.error('Error getting plans:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
}