'use strict';

const Model = require('./Model');

module.exports = class SnsClient extends Model {
    constructor(props) {
        super(props);

        this.schema = 'GEC';
        this.table = 'sns_clients'
    }

    getKeyName() {
        return 'sns_client_idx'
    }

    getKeyType() {
        return 'ai'
    }
};
