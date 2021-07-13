'use strict';

const Model = require('./Model');

module.exports = class Store extends Model {
    constructor(props) {
        super(props);

        this.table = 'stores';
        this.schema = 'GEC';
    }

    getKeyName() {
        return 'store_id';
    }
};
