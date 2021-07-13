'use strict';
const crypto = require('crypto');
const {keys} = require('../config');

const encryptPassword = (password) => {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(64, (err, buf) => {
            const salt = buf.toString('base64');

            crypto.pbkdf2(password, salt, 43576, 64, 'sha512', (err, key) => {
                resolve({
                    encrypted: key.toString('base64'),
                    salt: salt
                });
            });
        });
    })
};

const checkPassword = (password, salt) => {
    return new Promise((resolve) => {
        crypto.pbkdf2(password, salt, 43576, 64, 'sha512', (err, key) => {
            resolve(key.toString('base64'));
        });
    });
};

const aes256Encrypt = (targetString) => {
    const cipher = crypto.createCipher('aes-256-cbc', keys.aes256Key);
    let result = cipher.update(targetString, 'utf8', 'base64');
    result += cipher.final('base64');
    return result
};

const aes256Decrypt = (targetString) => {
    const decipher = crypto.createDecipher('aes-256-cbc', keys.aes256Key);
    let result = decipher.update(targetString, 'base64', 'utf8');
    result += decipher.final('utf8');
    return result;
};


module.exports = {
    encryptPassword,
    checkPassword,
    aes256Encrypt,
    aes256Decrypt
};
