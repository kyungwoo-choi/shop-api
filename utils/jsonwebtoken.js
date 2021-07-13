'use strict';
const jwt = require('jsonwebtoken');
const {tokenSecret} = require('../config/keys');

const sign = (payload) => {
    return new Promise((resolve, reject) => {
        jwt.sign(payload, tokenSecret, {
            expiresIn: 60 * 60 * 24
        }, (err, token) => {
            if (err) {
                return reject(err);
            } else {
                return resolve(token);
            }
        });
    });
};

const verification = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, tokenSecret, async (err, decoded) => {
            if (err) {
                return reject({
                    message: 'verification error',
                    err: err
                })
            }

            resolve(decoded);
        });
    });
};

module.exports = {
    sign,
    verification
};
