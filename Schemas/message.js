const Joi = require('joi');

const messageSchema = Joi.object({
    message: Joi.string().allow('').default(''),  // Allows the message field to be empty, defaults to an empty string
    circleId: Joi.string().required().messages({
        'string.base': `"circleId" should be a type of 'text'`,
        'string.empty': `"circleId" cannot be an empty field`,
        'any.required': `"circleId" is a required field`
    }),
    type: Joi.string().required().valid('text', 'plan').messages({
        'string.base': `"type" should be a type of 'text or plan'`,
        'string.empty': `"type" cannot be an empty field`
    }),
    planId: Joi.string().when('type', {
        is: 'plan',
        then: Joi.required().messages({
            'string.base': `"planId" should be a type of 'text'`,
            'string.empty': `"planId" cannot be an empty field`,
            'any.required': `"planId" is a required field`
        })
    }),
    media: Joi.array().items(
        Joi.object({
            type: Joi.string().required().valid('image', 'video', 'audio', 'document').messages({
                'string.base': `"type" should be a type of 'text'`,
                'string.empty': `"type" cannot be an empty field`,
                'any.required': `"type" is a required field`,
                'any.only': `"type" should be one of 'image', 'video', 'audio'`
            }),
            url: Joi.string().required().uri().messages({
                'string.base': `"url" should be a type of 'text'`,
                'string.empty': `"url" cannot be an empty field`,
                'string.uri': `"url" must be a valid URI`,
                'any.required': `"url" is a required field`
            }),
            mimetype: Joi.string().required().messages({
                'string.base': `"mimetype" should be a type of 'text'`,
                'string.empty': `"mimetype" cannot be an empty field`,
                'any.required': `"mimetype" is a required field`
            })
        })
    ).messages({
        'array.base': `"media" should be a type of 'array'`
    })
});

module.exports = {
    messageSchema
};
