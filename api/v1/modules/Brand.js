'use strict';
const Model = require('./Model');

module.exports = class Brand extends Model {
    constructor(props) {
        super(props);

        this.table = 'brands';
        this.schema = 'GEC';
    }

    getKeyName() {
        return 'brand_id';
    }

    getKeyType() {
        return 'ai';
    }

}
