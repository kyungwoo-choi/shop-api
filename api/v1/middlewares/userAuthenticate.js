'use strict';
const User = require('../modules/User');
const Responder = require('../../../utils/Responder');

module.exports = async (req, res, next) => {
    const user = new User();
    const responder = new Responder(res);

    const token = req.get('Authorization');

    if (!token) {
        responder.msg = 'token이 필요합니다.';
        responder.error = true;
        responder.status = 401;
        return await responder.send();
    }

    try {
        await user.authenticate(token);
        await user.find({});

        req.user = user;
        next();
    } catch (e) {
        console.error(e);
        if (e.err.name === 'TokenExpiredError') {
            responder.msg = '만료된 토큰입니다. 재로그인이 필요합니다.'
        } else {
            responder.msg = e.message;
        }

        responder.error = true;
        responder.status = 401;
        return await responder.send();
    } finally {
        await user.destroy();
    }
};
