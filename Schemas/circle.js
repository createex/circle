const joi = require('joi');

const descriptionField = joi.string().required().messages({
    'string.base': `"description" should be a type of 'text'`,
    'string.empty': `"description" cannot be an empty field`,
    'any.required': `"description" is a required field`
});

const memberIdsField = joi.array().items(joi.string()).messages({
    'array.base': `"memberIds" should be a type of 'array'`,
    'string.base': `"memberIds" should be a type of 'text'`,
});


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
    description: descriptionField,
    type: joi.string().required().valid('friend', 'family', 'organization', 'mix').messages({
        'string.base': `"type" should be a type of 'text'`,
        'string.empty': `"type" cannot be an empty field`,
        'any.required': `"type" is a required field`,
        'any.only': `"type" should be one of 'friend', 'family', 'organization', 'mix'`
    }),
    interest: joi.string().required().valid('photography', 'shopping', 'music', 'movies',
        'fitness', 'travelling', 'sports', 'videoGames', 'nightOut', 'art'
    ).messages({
        'string.base': `"interest" should be a type of 'text'`,
        'string.empty': `"interest" cannot be an empty field`,
        'any.required': `"interest" is a required field`,
        'any.only': `"interest" should be one of 'photography', 'shopping', 'music', 'movies',
        'fitness', 'travelling', 'sports', 'videoGames', 'nightOut', 'art'`
    }),
    memberIds: memberIdsField,
    phoneNumbers: joi.array().items(joi.string()).messages({
        'array.base': `"phoneNumbers" should be a type of 'array'`,
    }),
});

const todoSchema = joi.object({
    title: joi.string().required().messages({
        'string.base': `"title" should be a type of 'text'`,
        'string.empty': `"title" cannot be an empty field`,
        'any.required': `"title" is a required field`
    }),
    description: descriptionField,
    images: joi.array().items(joi.string()).messages({
        'array.base': `"images" should be a type of 'array'`,
        'string.base': `"images" should be a type of 'text'`,
    }),
    memberIds: memberIdsField,
    circleId: joi.string().required().messages({
        'string.base': `"circleId" should be a type of 'text'`,
        'string.empty': `"circleId" cannot be an empty field`,
        'any.required': `"circleId" is a required field`
    }),
    bill: joi.object({
        total: joi.number().required().messages({
            'number.base': `"total" should be a type of 'number'`,
            'any.required': `"total" is a required field`
        }),
        title: joi.string().required().messages({
            'string.base': `"bill title" should be a type of 'text'`,
            'string.empty': `"bill title" cannot be an empty field`,
            'any.required': `"bill title" is a required field`
        }),
        images: joi.array().items(joi.string()).messages({
            'array.base': `"bill images" should be a type of 'array'`,
            'string.base': `"bill images" should be a type of 'text'`,
        }),
        members: joi.array().items(joi.string()).messages({
            'array.base': `"members" should be a type of 'array'`,
            'string.base': `"members" should be a type of 'text'`,
        }),
    }).messages({
        'object.base': `"bill" should be a type of 'object'`,
    })
});

module.exports = {
    circleSchema,
    todoSchema
};
