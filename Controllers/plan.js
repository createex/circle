const {planModel, eventTypeModel} = require('../Models/plan');
const userModel = require('../Models/user');
const circleModel = require('../Models/circle');



/**
 * @description Create a plan for a circle by the user  
 * @route POST /plan/create
 * @access Private
 */

module.exports.createPlan = async (req, res) => {
    const { name, description, date, location, eventType, members, budget } = req.body;


    if(!name || !date || !location || !eventType  || !members || !budget) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }
    try {



        
        const plan = new planModel({
            name,
            description,
            date,
            location,
            eventType,
            members,
            budget,
            createdBy: req.user._id
        });

        await plan.save();

        // Add the plan to the circle's plan list
        req.user.plans.push(plan._id);
        await req.user.save();
        res.status(201).json({ message: 'Plan created successfully', plan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * @description Get event types of a circle
 * @route GET /plan/event-types
 * @access Private
 */

module.exports.getEventTypes = async (req, res) => {

    // Get the event types of the user, populate the eventType field in user 
    const user= await userModel.findById(req.user._id).populate('events');


        res.status(200).json({
            success: true,
            message: 'Event types retrieved successfully',
            eventTypes: user.events
        });
}

/**
 * @description Create an event type for a circle and push it to the circle's event types list
 * @route POST /plan/event-types/create
 * @access Private
 */

module.exports.createEventType = async (req, res) => {
    const { name, color } = req.body;
    if(!name || !color ) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }

    try {
   
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

        // Add the event type to the user events list
        req.user.events.push(eventType._id);
        await req.user.save();


        
        res.status(201).json({ message: 'Event type created successfully', eventType });
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error('Error creating event type:', error);
    }
}

/**
 * @description Get plans for a circle (populated with event type and members)
 * @route GET /plan/get
 * @access Private
 */

module.exports.getPlans = async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id)
            .populate({
                path: 'plans',
                populate: [
                    {
                        path: 'eventType',
                        model: 'EventType'
                    },
                    {
                        path: 'members',
                        model: 'User',
                        select: 'name email profilePicture _id'
                    }
                ]
            });

        res.status(200).json({
            success: true,
            message: 'Plans and members retrieved successfully',
            plans: user.plans
        });
    } catch (error) {
        console.error('Error getting plans:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
}



/**
 * @description Delete a plan from a circle - only the creator of the plan can delete it
 * @route DELETE /plan/delete/:planId
 * @access Private
 */

module.exports.deletePlan = async (req, res) => {
    const { planId } = req.params;

    try {
        const plan = await planModel.findById(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        // Check if the logged-in user is the creator of the plan
        if (plan.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized to delete this plan' });
        }



        // Delete the plan from the user's plans list

        req.user.plans = req.user.plans.filter(p => p.toString() !== planId);
        await req.user.save();
        await planModel.findByIdAndDelete(planId);
        

        res.status(200).json({ message: 'Plan deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
