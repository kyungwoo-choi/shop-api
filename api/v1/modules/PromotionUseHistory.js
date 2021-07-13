'use strict';
const Model = require('./Model');

module.exports = class PromotionUseHistory extends Model {
    constructor(props) {
        super(props);

        this.schema = 'gec_promotion';
        this.table = 'promotion_use_histories'
    }

    getKeyName() {
        return 'promotion_use_history_idx'
    }

    getKeyType() {
        return 'ai'
    }


};
