'use strict';
const crypto = require('./crypto');

const generate = async (password = '') => {
    const {encrypted, salt} = await crypto.encryptPassword(password);

    return {
        password: encrypted,
        salt: salt,
        origin: password
    }
};

module.exports = generate;
