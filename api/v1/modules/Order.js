'use strict';

const Model = require('./Model');

module.exports = class Order extends Model {
    constructor(props) {
        super(props);

        this.table = 'orders';
        this.schema = 'GEC_ORDER'
    }

    getKeyName() {
        return 'order_id'
    }
};
