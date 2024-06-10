const userModel = require('../Models/user');
const bcrypt = require('bcrypt');
const { userSignupSchema } = require('../Schemas/user');
const generateToken = require('../Utils/generateToken');
const { get6DigitCode } = require('../Utils/methods');
const { sendVerificationSMS, sendInviteLinks } = require('../Utils/sms');
const { uploadImage } = require('../Utils/upload');

/**
 * @description Register a new user
 * @route POST /auth/signup
 * @access Public
 */

module.exports.signup = async (req, res) => {
    try {
        // Validate the request body
        const { error } = userSignupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const { name, email, password, phoneNumber } = req.body;

        // Check if the phone number already exists (for invited users)
        let user = await userModel.findOne({ phoneNumber });

        if (user) {
            // If email or password is not null, it means the user already registered
            if (user.email && user.password) {
                return res.status(400).json({ error: 'Phone number already registered' });
            }
        } else {
            // Check if email already exists for new registrations
            const emailExists = await userModel.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            // Create a new user object
            user = new userModel({ phoneNumber });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const verificationCode = get6DigitCode();

        // Update the user record with the new details
        user.name = name;
        user.email = email;
        user.password = hashedPassword;
        user.verificationCode = {
            code: verificationCode,
            expires: new Date(Date.now() + 120000),
        };
        user.isVerified = false;

        // Save the user to the database
        await user.save();

        // Send the verification code via SMS
        await sendVerificationSMS(phoneNumber, verificationCode);

        res.status(201).json({
            success: true,
            message: 'User registered successfully, verification code sent',
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * @description resend the code on phone number 
 * @route POST /auth/resend-code
 * @access Public
 */

module.exports.resendCode = async (req, res) => {
    try {
        // Find the user by phone number
        const user = await userModel.findOne({ phoneNumber: req.body.phoneNumber });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if the user is already verified
        if (user.isVerified) {
            return res.status(400).json({ error: 'User already verified' });
        }
        // Check if the verification code is expired
        if (user.verificationCode.expires > Date.now()) {
            return res.status(400).json({ error: 'Verification code not expired' });
        }
        // Resend the verification code
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
        // Find the user by phoneNumber
        const user = await userModel.findOne({ phoneNumber: req.body.phoneNumber });
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
        const user = await userModel.findOne({
            phoneNumber: req
                .body.phoneNumber
        });
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
        const image = await uploadImage('circle', req.file);
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

/**
 * @description  send Invitation Link to users phone number of the App to join the App
 * @route POST /auth/invite
 * @param (phoneNumbers, link)
 * @access Private
 */

module.exports.invite = async (req, res) => {
    try {
        const { phoneNumbers, message } = req.body;
        await sendInviteLinks(phoneNumbers, message);
        res.status(200).json({
            success: true,
            message: 'Invitation link sent successfully',
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * @description Check if users exist by phone numbers and return their details
 * @route GET /auth/check-users
 * @param phoneNumbers
 * @access Private
 */

module.exports.checkUsersByPhoneNumbers = async (req, res) => {
    try {
        const { phoneNumbers } = req.body;

        if (!Array.isArray(phoneNumbers)) {
            return res.status(400).json({ error: 'phoneNumbers should be an array' });
        }

        // Initialize an array to hold the results
        const results = [];

        // Iterate through the phone numbers
        for (const phoneNumber of phoneNumbers) {
            const user = await userModel.findOne({ phoneNumber });

            if (user) {
                if (user.email) {
                    // User exists and is fully registered
                    results.push({
                        phoneNumber,
                        userId: user._id,
                        profilePicture: user.profilePicture,
                        isUser: true
                    });
                } else {
                    // User exists but is only invited (no email means they haven't completed registration)
                    results.push({
                        phoneNumber,
                        userId: user._id,
                        profilePicture: user.profilePicture,
                        isUser: false
                    });
                }
            } else {
                // User does not exist
                results.push({
                    phoneNumber,
                    isUser: false
                });
            }
        }

        // Send the response
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * @description Get own details (profile) of the logged in user
 * @route GET /auth/profile
 * @access Private
 */

/**
 * @description Get own details (profile) of the logged in user
 * @route GET /auth/profile
 * @access Private
 */

module.exports.getProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id)
            .select('name email phoneNumber profilePicture _id');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}








