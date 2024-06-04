const router = require('express').Router();

// Import the itinerary controller
const{
    createItinerary,
    getItineraries
} = require('../Controllers/itinerary');

//Middleware
const { customerMiddleware } = require("../Middlewares/user");

//Routes
router.use(customerMiddleware)
router.post('/create', createItinerary)
router.get('/get', getItineraries)

module.exports = router;