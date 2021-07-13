'use strict';
const uuid1 = require('uuid/v1');
// const v4 = require('uuid/v4');

module.exports = {
    v1() {
        const tokens = uuid1().split('-');

        // const uuid = `${tokens[2]}-${tokens[1]}-${tokens[0]}-${tokens[3]}-${tokens[4]}`;
        const uuid = `${tokens[2]}${tokens[1]}${tokens[0]}${tokens[3]}${tokens[4]}`;

        return Buffer.from(uuid, 'hex');
    },
    decode(buf) {
        return buf.toString('hex').toLowerCase();
    },
    toBuffer(uuid) {
        return Buffer.from(uuid, 'hex');
    }
};
