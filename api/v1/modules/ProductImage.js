'use strict';

const Model = require('./Model');

module.exports = class ProductImage extends Model{
    constructor(props) {
        super(props);

        this.table='product_images';
        this.schema = 'GEC';

    }

    getKeyName() {
        return 'image_idx'
    }

    getKeyType() {
        return 'ai';
    }
};
