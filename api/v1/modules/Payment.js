'use strict';
const Model = require('./Model');

module.exports = class Payment extends Model {
    constructor(props) {
        super(props);

        this.schema = 'GEC_ORDER';
        this.table = 'payments';
    }

    getKeyName() {
        return 'payment_idx'
    }

    getKeyType() {
        return 'ai'
    }
};
