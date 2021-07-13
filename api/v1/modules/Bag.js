'use strict';

const Model = require('./Model');

module.exports = class Bag extends Model {
    constructor(props) {
        super(props);

        this.table = 'bag';
        this.schema = 'GEC';
    }

    getKeyName() {
        return 'seq';
    }

    getKeyType() {
        return 'ai';
    }

    async getBagItems(user_id = null) {
        if (!user_id) {
            throw {
                status: 500,
                message: 'user_id empty'
            }
        }

        let sql = `
        select products.store_name,
               products.name,
               products.category_id,
               products.brand_id,
               products.cost,
               products.brand_name,
               products.main_image,
               products.status,
               products.category_name,
               LOWER(HEX(product_options.option_id)) as option_id,
               LOWER(HEX(product_options.product_id)) as product_id,
               product_options.option_1,
               product_options.option_2,
               product_options.option_3,
               product_options.option_4,
               product_options.option_5,
               product_options.add_price,
               product_options.order_stock,
               product_options.stock,
               (select path from GEC.product_images pi where pi.product_id = bag.product_id limit 1) as image,
               bag.seq,
               bag.quantity
        from GEC.bag
                 inner join (select products.product_id,
                                    products.store_id,
                                    products.category_id,
                                    products.brand_id,
                                    products.name,
                                    products.main_image,
                                    products.cost,
                                    products.status,
                                    categories.name as category_name,
                                    brands.brand_name,
                                    stores.name     as store_name
                             from GEC.products
                                      inner join GEC.brands on GEC.products.brand_id = GEC.brands.brand_id
                                      inner join GEC.categories on GEC.products.category_id = GEC.categories.category_id
                                      inner join GEC.stores on GEC.products.store_id = GEC.stores.store_id) products
                            on GEC.bag.product_id = products.product_id
                 inner join GEC.product_options on GEC.bag.option_id = GEC.product_options.option_id
        where bag.user_id=?
        `;

        await this.getConnection();

        let [rows] = await this.connection.query(sql, [user_id]);

        return rows;
    }
};
