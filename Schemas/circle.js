const joi = require('joi');


const circleSchema = joi.object({
    circleName: joi.string().required().messages({
        'string.base': `"circleName" should be a type of 'text'`,
        'string.empty': `"circleName" cannot be an empty field`,
        'any.required': `"circleName" is a required field`
    }),
    circleImage: joi.string().required().messages({
        'string.base': `"circleImage" should be a type of 'text'`,
        'string.empty': `"circleImage" cannot be an empty field`,
        'any.required': `"circleImage" is a required field`
    }),
    description: joi.string().required().messages({
        'string.base': `"description" should be a type of 'text'`,
        'string.empty': `"description" cannot be an empty field`,
        'any.required': `"description" is a required field`
    }),
    type: joi.string().required().allow('friend', 'family', 'organization', 'mix').messages({
        'string.base': `"type" should be a type of 'text'`,
        'string.empty': `"type" cannot be an empty field`,
        'any.required': `"type" is a required field`,
        'any.only': `"type" should be one of 'friend', 'family', 'organization', 'mix'`
    }),
    interest: joi.string().required().allow('photography', 'shopping', 'music', 'movies',
        'fitness', 'travelling', 'sports', 'videoGames', 'nightOut', 'art'
    ).messages({
        'string.base': `"interest" should be a type of 'text'`,
        'string.empty': `"interest" cannot be an empty field`,
        'any.required': `"interest" is a required field`,
        'any.only': `"interest" should be one of 'photography', 'shopping', 'music', 'movies',
        'fitness', 'travelling', 'sports', 'videoGames', 'nightOut', 'art'`
    }),
    memberIds: joi.array().items(joi.string()).messages({
        'array.base': `"members" should be a type of 'array'`,
    }),
    phoneNumbers: joi.array().items(joi.string()).messages({
        'array.base': `"invitedPhoneNumbers" should be a type of 'array'`,
    }),
});

module.exports = {
    circleSchema
}