const router = require("express").Router();

//controllers
const{

    createTodo,
    getTodos,
    getTodo,
    getBill,
    updateBill
}=require('../Controllers/todos')

//Middlewares
const {customerMiddleware}=require('../Middlewares/user')

//routes
router.use(customerMiddleware)
router.post('/create',createTodo)
router.get('/get/:circleId',getTodos)
router.get('/get/:todoId/:circleId',getTodo)
router.get('/bill/:todoId',getBill)
router.put('/bill/:todoId/:circleId',updateBill)


module.exports=router;