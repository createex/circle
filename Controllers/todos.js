const circleModel = require('../Models/circle');
const todosModel = require('../Models/todos');
const { todoSchema } = require('../Schemas/circle');
const mongoose = require('mongoose');
const userModel = require('../Models/user');


/**
 * @description Create a new todo
 * @route POST /todos/create
 * @access Private
 */

module.exports.createTodo = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { error } = todoSchema.validate(req.body, { abortEarly: false });
        if (error) {
            throw new Error(error.details.map(x => x.message).join(', '));
        }


        circle = await circleModel.findById(req.body.circleId).session(session);
        if (!circle) {
            throw new Error('Circle not found');
        }

        // Directly add new members to the circle 
        if (req.body.memberIds && circle) {
            circle.members.push(...req.body.memberIds);
            await circle.save({ session });
        }

        // Create a new Todo
        const { title, description, images, bill } = req.body;
        const todo = new todosModel({ title, description, images, bill });
        await todo.save({ session });
        if (circle) {
            await circleModel.findByIdAndUpdate(circle._id, { $push: { todos: todo._id } }, { session });
        }

        // Add the circle id to each new member's memberGroups
        await Promise.all(req.body.memberIds.map(memberId => {
            return userModel.findByIdAndUpdate(memberId, { $push: { memberGroups: circle._id } }, { session });
        }));

        await session.commitTransaction();
        session.endSession();
        return res.status(201).json({ message: 'Todo created successfully', todo });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ error: 'Transaction failed: ' + err.message });
    }
}

/**
 * @description Update a todo bill
 * @route PUT /todos/update-bill/:todoId/:circleId
 * @access Private
 */

module.exports.updateBill = async (req, res) => {
    try {
        // Validate the request body
        if (!req.body.memberId) {
            return res.status(400).json({ error: 'Member ID is required' });
        }

        // check if the circle exists 
        const circle = await circleModel.findById(req.params.circleId);
        if (!circle) {
            return res.status(404).json({ error: 'Circle not found' });
        }
        
        //check if circle owned by the user 
        if (!circle.owner.equals(req.user._id)) {
            return res.status(403).json({ error: 'You are not authorized to update the bill' });
        }

        // now update the bill by adding the member to the paidBy
        const todo = await todosModel.findByIdAndUpdate(
            req.params.todoId,
            { $push: { 'bill.paidBy': req.body.memberId } },
            { new: true }
        );


        res.status(200).json({
            success: true,
            message: 'Bill updated successfully',
            todoId: todo._id,
        });

    }
    catch (error) {
        console.error('Error updating bill:', error);
        res.status(500).json({ error: 'Failed to update bill' });

    }
}

/**
 * @description Get the bill of a todo, detailing payments and pending amounts
 * @route GET /todos/bill/:todoId
 * @access Private
 */

module.exports.getBill = async (req, res) => {
    if (!req.params.todoId) return res.status(400).json({ error: 'Todo ID is required' });
    try {
        const todo = await todosModel.findById(req.params.todoId)
            .populate('bill.members', 'name profilePicture') // Populate members with name and profile picture
            .populate('bill.paidBy', 'name profilePicture');
        
        if (!todo) {
            return res.status(404).json({ error: 'Todo not found' });
        }

        const totalBillAmount = todo.bill.total;
        const amountPerMember = totalBillAmount / todo.bill.members.length;
        const totalPaid = todo.bill.paidBy.length * amountPerMember;
        const totalPending = totalBillAmount - totalPaid;

        const pendingUsers = todo.bill.members.filter(member => 
            !todo.bill.paidBy.some(paidMember => paidMember._id.equals(member._id)))
            .map(user => ({
                memberId: user._id,
                name: user.name,
                profilePicture: user.profilePicture
            }));

        const paidUsers = todo.bill.paidBy.map(user => ({
            memberId: user._id,
            name: user.name,
            profilePicture: user.profilePicture
        }));

        // Prepare the total members details
        const allMembers = todo.bill.members.map(member => ({
            memberId: member._id,
            name: member.name,
            profilePicture: member.profilePicture
        }));

        res.status(200).json({
            success: true,
            message: 'Bill retrieved successfully',
            billDetails: {
                totalBillAmount,
                totalPaid,
                totalPending,
                payablePerUser: amountPerMember,
                totalMembers: allMembers.length, // Total members count
                allMembers, // Include all members with their details
                pendingUsers,
                paidUsers,
                billReceiptImages: todo.bill.images
            }
        });

    } catch (error) {
        console.error('Error getting bill:', error);
        res.status(500).json({ error: 'Failed to get bill' });
    }
};
/**
 * @description Get all todos within a circle with pagination and member details
 * @route GET /todos/get/:circleId
 * @access Private
 */

module.exports.getTodos = async (req, res) => {
    const { circleId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    if (!circleId) {
        return res.status(400).json({ error: 'Circle ID is required' });
    }

    try {
        // Fetch the circle to check existence and membership
        const circle = await circleModel.findOne({
            _id: circleId,
            $or: [{ members: req.user._id }, { owner: req.user._id }]
        }).populate({
            path: 'members',
            select: 'name profilePicture',
            model: 'User'
        }).populate({
            path: 'todos',
            model: 'Todo',
            populate: {
                path: 'bill.members',
                select: 'name profilePicture',
                model: 'User'
            }
        });

        if (!circle) {
            return res.status(403).json({ error: 'You are not authorized to view todos in this circle' });
        }

        // Use the populated todos directly from the circle
        const todos = circle.todos || [];
        const totalTodos = todos.length;

        // Slice todos for pagination
        const paginatedTodos = todos.slice(skip, skip + limit);

        const todosInfo = paginatedTodos.map(todo => {
            let members;

            // Determine members from bill if exists and has members; otherwise, use circle members
            if (todo.bill && todo.bill.members.length > 0) {
                members = todo.bill.members.map(member => ({
                    memberId: member._id,
                    name: member.name,
                    profilePicture: member.profilePicture
                }));
            } else {
                members = circle.members.map(member => ({
                    memberId: member._id,
                    name: member.name,
                    profilePicture: member.profilePicture
                }));
            }

            return {
                id: todo._id, // Include the ID of the todo
                title: todo.title,
                billStatus: todo.bill ? (todo.bill.members.length === (todo.bill.paidBy || []).length ? 'Paid' : 'Pending') : 'No Bill',
                totalBill: todo.bill ? todo.bill.total : 'N/A',
                members: members
            };
        });

        res.status(200).json({
            success: true,
            message: 'Todos retrieved successfully',
            todos: todosInfo,
            pagination: {
                total: totalTodos,
                page: page,
                limit: limit
            }
        });

    } catch (error) {
        console.error('Error getting todos:', error);
        res.status(500).json({ error: 'Failed to get todos' });
    }
};



/**
 * @description Get a single todo by ID
 * @route GET /todos/:todoId/:circleId
 * @access Private
 */

module.exports.getTodo = async (req, res) => {
    const { todoId, circleId } = req.params;

    if (!todoId || !circleId) {
        return res.status(400).json({ error: 'Both Todo ID and Circle ID are required' });
    }

    try {
        // Fetch the specific todo
        const todo = await todosModel.findById(todoId);
        if (!todo) {
            return res.status(404).json({ error: 'Todo not found' });
        }

        // Check if the circle exists and the user is authorized (member or owner)
        const circle = await circleModel.findOne({
            _id: circleId,
            $or: [{ members: req.user._id }, { owner: req.user._id }]
        }).populate({
            path: 'members',
            select: 'name profilePicture',
            model: 'User'
        });

        if (!circle) {
            return res.status(403).json({ error: 'You are not authorized to view todos in this circle' });
        }

        // Format the members from the circle
        const members = circle.members.map(member => ({
            memberId: member._id,
            name: member.name,
            profilePicture: member.profilePicture
        }));

        // Prepare the todo information to return
        const todoInfo = {
            title: todo.title,
            description: todo.description,
            images: todo.images,
            members: members
        };

        res.status(200).json({
            success: true,
            message: 'Todo retrieved successfully',
            todo: todoInfo
        });

    } catch (error) {
        console.error('Error getting todo:', error);
        res.status(500).json({ error: 'Failed to get todo' });
    }
};



