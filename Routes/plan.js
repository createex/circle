const router = require('express').Router();

// Import the plan controller
const{
    createPlan,
    getPlansByDate,
    getEventTypes,
    createEventType,
    deletePlan

} = require('../Controllers/plan');

//Middleware
const { customerMiddleware } = require("../Middlewares/user");

//Routes
router.use(customerMiddleware)
router.post('/create', createPlan)
router.get('/get', getPlansByDate)
router.get('/event-types', getEventTypes)
router.post('/event-types/create', createEventType)
router.delete('/delete/:planId', deletePlan)

module.exports = router;