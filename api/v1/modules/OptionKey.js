'use strict';
const Model = require('./Model');

module.exports = class OptionGroup extends Model {
    constructor(props) {
        super(props);

        this.table = 'product_option_keys';
        this.schema = 'GEC';
    }

    getKeyName() {
        return 'key_idx';
    }

    getKeyType() {
        return 'ai';
    }
}
