'use strict';

const Model = require('./Model');

module.exports = class PromotionTarget extends Model {
    constructor(props) {
        super(props);

        this.schema = 'gec_promotion';
        this.table = 'promotion_brands';
    }

    getKeyName () {
        return 'promotion_brand_idx'
    }

    getKeyType() {
        return 'ai'
    }
};
