const userModel = require('../Models/user');
const bcrypt = require('bcrypt');
const { userSignupSchema } = require('../Schemas/user');
const generateToken = require('../Utils/generateToken');
const { get6DigitCode } = require('../Utils/methods');
const sendVerificationSMS = require('../Utils/sms');
const uploadImage = require('../Utils/upload');

/**
 * @description Register a new user
 * @route POST /auth/signup
 * @access Public
 */

module.exports.signup = async (req, res) => {
    try {
        // Validate the request body
        const { error } = userSignupSchema(req.body);
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Check if email or phone number already exists
        const emailOrPhoneExists = await userModel.findOne({
            $or: [{ email: req.body.email }, { phoneNumber: req.body.phoneNumber }],
        });
        if (emailOrPhoneExists) {
            return res.status(400).json({ error: 'Email or phone number already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        const verificationCode = get6DigitCode();

        // Create a new user
        const user = new userModel({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            phoneNumber: req.body.phoneNumber,
            verificationCode: {
                code: verificationCode,
                expires: new Date(Date.now() + 120000),
            },
            isVerified: false,
        });

        // Save the user to the database
        await user.save();
        // Send the verification code via SMS
        await sendVerificationSMS(req.body.phoneNumber, verificationCode);
        // Send the response
        res.status(201).json({
            success: true,
            message: 'User registered successfully',

         });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * @description Verify a user
 * @route POST /auth/verify
 * @access Public
 */

module.exports.verify = async (req, res) => {
    try {
        // Find the user by phone number
        const user = await userModel.findOne({ phoneNumber: req.body.phoneNumber });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if the verification code is correct and not expired
        if (user.verificationCode.code !== req.body.code || user.verificationCode.expires < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }
        // Update the user
        user.isVerified = true;
        await user.save();
        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            message: 'User verified successfully',
            token,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}


/**
 * @description Login a user
 * @route POST /auth/login
 * @access Public
 */

module.exports.login = async (req, res) => {
    try {
        // Find the user by email
        const user = await userModel.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if the user is verified
        if (!user.isVerified) {
            return res.status(400).json({ error: 'User not verified' });
        }
        // Check if the password is correct
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }
        // Generate a token
        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            token,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
/**
 * @description Forgot password
 * @route POST /auth/forgot-password
 * @access Public
 */

module.exports.forgotPassword = async (req, res) => {
    try {
        // Find the user by email
        const user = await userModel.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // send OTP to the user's phone number
        const verificationCode = get6DigitCode();
        user.verificationCode = {
            code: verificationCode,
            expires: new Date(Date.now() + 120000),
        };
        await user.save();
        await sendVerificationSMS(user.phoneNumber, verificationCode);
        res.status(200).json({
            success: true,
            message: 'Verification code sent successfully',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}


/**
 * @description Reset password
 * @route POST /auth/reset-password
 * @access Public
 */

module.exports.resetPassword = async (req, res) => {
    try {
        // Find the user by email
        const user = await userModel.findOne({ email: req
            .body.email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if the verification code is correct and not expired
        if (user.verificationCode.code !== req.body.code || user.verificationCode.expires < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        // Update the user
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }

}

/**
 * @description Update user profile picture
 * @route POST /auth/update-profile-picture
 * @access Private
 */

module.exports.updateProfilePicture = async (req, res) => {
    try {
        // Upload the image to Azure Blob Storage
        const image = await uploadImage('profile-pictures', req.file);
        // Find the user by id
        const user = await userModel.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Update the user
        user.profilePicture = image.url;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Profile picture updated successfully',
            data: image,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}


