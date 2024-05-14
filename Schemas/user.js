const joi = require('joi');


// Common definitions for reuse
const emailValidation = joi.string().email().required().messages({
    'string.base': `"email" should be a type of 'text'`,
    'string.email': `"email" should be a valid email`,
    'string.empty': `"email" cannot be an empty field`,
    'any.required': `"email" is a required field`
});

const passwordValidation = joi.string().min(6).required().messages({
    'string.base': `"password" should be a type of 'text'`,
    'string.min': `"password" should have at least 6 characters`,
    'string.empty': `"password" cannot be an empty field`,
    'any.required': `"password" is a required field`
});

// Define the schema

const userSignupSchema = joi.object({
    email: emailValidation,
    password: passwordValidation,
    name: joi.string().required().messages({
        'string.base': `"name" should be a type of 'text'`,
        'string.empty': `"name" cannot be an empty field`,
        'any.required': `"name" is a required field`
    }),
    phoneNumber: joi.string().required().messages({
        'string.base': `"phoneNumber" should be a type of 'text'`,
        'string.empty': `"phoneNumber" cannot be an empty field`,
        'any.required': `"phoneNumber" is a required field`
    }),
});

module.exports = {
    userSignupSchema
}