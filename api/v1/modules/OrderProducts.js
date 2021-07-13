'use strict';
const Model = require('./Model');

module.exports = class OrderProducts extends Model {
    constructor(props) {
        super(props);

        this.schema = 'GEC_ORDER';
        this.table = 'order_products';
    }

    getKeyName() {
        return 'item_idx';
    }

    getKeyType() {
        return 'ai';
    }
};
