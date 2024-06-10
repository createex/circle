const router = require('express').Router();

// Import the plan controller
const{
    createPlan,
    getPlans,
    getEventTypes,
    createEventType,
    deletePlan

} = require('../Controllers/plan');

//Middleware
const { customerMiddleware } = require("../Middlewares/user");

//Routes
router.use(customerMiddleware)
router.post('/create/:circleId', createPlan)
router.get('/get/:circleId', getPlans)
router.get('/event-types/:circleId', getEventTypes)
router.post('/event-types/create/:circleId', createEventType)
router.delete('/delete/:circleId/:planId', deletePlan)

module.exports = router;