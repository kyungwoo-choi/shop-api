'use strict';

const Model = require('./Model');

module.exports = class PromotionTarget extends Model {
    constructor(props) {
        super(props);

        this.schema = 'gec_promotion';
        this.table = 'promotion_targets';
    }

    getKeyName () {
        return 'promotion_target_idx'
    }

    getKeyType() {
        return 'ai'
    }
};
