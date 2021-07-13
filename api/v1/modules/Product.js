'use strict';

const Model = require('./Model');
const Option = require('./Option');
const OptionKey = require('./OptionKey');
const ProductImage = require('./ProductImage');
const Brand = require('./Brand');

module.exports = class Product extends Model {
    constructor(props) {
        super(props);

        this.schema = 'GEC';
        this.table = 'products';
    }

    getKeyName() {
        return 'product_id';
    }

    async getImages() {
        await this.getConnection();

        const productImage = new ProductImage();

        productImage.setConnection(this.connection);

        return await productImage.findAll({
            where: [
                ['product_id', await this.getQueryKeyValue()]
            ],
            hex_fields: [
                'product_id'
            ]
        });
    }

    async getOption (query = []) {
        await this.getConnection();

        let _option = {};

        const option = new Option();
        const optionKey = new OptionKey();

        option.setConnection(this.connection);
        optionKey.setConnection(this.connection);

        const productId = await this.getQueryKeyValue();

        let where = [];
        where.push(['product_id', '=', productId]);

        for (const queryName in query) {
            if ('option_1' || 'option_2' || 'option_3' || 'option_4' || 'option_5') {
                if (query[queryName]) {
                    where.push([queryName, '=', query[queryName]])
                }
            }
        }

        _option.options = await option.findAll({
            where,
            hex_fields: ['product_id']
        });

        _option.keys = await optionKey.findAll({
            where: [['product_id', '=', productId]],
            hex_fields: ['product_id']
        });

        return _option;
    }

    async getDetail() {
        await this.getConnection();

        await this.find({
            hex_fields: ['store_id', 'product_id', 'category_id'],
            join: [{
                model: new Brand(),
                key: 'brand_id'
            }]
        });

        let product = this.fields;

        product.images = await this.getImages();
        product.option = await this.getOption();

        return product;
    }
};
