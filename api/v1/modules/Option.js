'use strict';
const Model = require('./Model');
const uuid = require('../../../utils/uuid');

module.exports = class Option extends Model {
    constructor(props) {
        super(props);

        this.table = 'product_options';
        this.schema = 'GEC';
    }

    getKeyName() {
        return 'option_id';
    }

    async create(product_id, optionData) {
        product_id = uuid.toBuffer(product_id);

        if (!this.connection) {
            await this.getConnection();
        }

        await this.connection.beginTransaction();

        let sequence = 1;
        let keyLength = optionData.keys.length;
        let query;
        let params = [];
        try {
            query = `insert into ${this.schema}.product_option_keys (key_idx, product_id, \`sequence\`, \`name\`, display_name) 
                            values ? 
                        on duplicate key update 
                            \`sequence\` = values(\`sequence\`), 
                            \`name\` = values(\`name\`), 
                            display_name = values(display_name),
                            updated_at = CURRENT_TIMESTAMP()`;

            for (const keyData of optionData.keys) {
                params.push([
                    keyData.key_idx || null,
                    product_id,
                    sequence,
                    keyData.name,
                    keyData.display_name
                ]);
                sequence++;
            }

            await this.connection.query(query, [params])
        } catch (e) {
            await this.connection.rollback();
            throw Error(e)
        }

        try {
            params = [];

            let optionColumns = [];
            for (let i = 1; i <= keyLength; i++) {
                optionColumns.push(`option_${i}`)
            }

            optionColumns = optionColumns.join(',') + ',';

            query = `insert into ${this.schema}.${this.table} (
                         option_id,
                         product_id,
                         ${optionColumns}
                         add_price,
                         stock
                    )  values ? on duplicate key update 
                        option_1 = values(option_1),
                        option_2 = values(option_2),
                        option_3 = values(option_3),
                        option_4 = values(option_4),
                        option_5 = values(option_5),
                        add_price = values(add_price),
                        stock = values(stock),
                        updated_at = CURRENT_TIMESTAMP()`;

            for (const group of optionData.groups) {
                if (group.values.length !== keyLength) {
                    await this.connection.rollback();
                }

                let option = [];

                let queryKeyValue;

                if (!group.option_id) {
                    await this.generateKey();
                } else {
                    this.setKeyValue(group.option_id);
                }

                queryKeyValue = await this.getQueryKeyValue();

                option.push(
                    queryKeyValue,
                    product_id
                );

                for (const value of group.values) {
                    if (!value) {
                        await this.connection.rollback();
                    }

                    option.push(value);
                }

                option.push(
                    group.add_price,
                    group.stock
                );

                params.push(option);
            }

            await this.connection.query(query, [params]);
            await this.connection.commit();
        } catch (e) {
            await this.connection.rollback();
            throw Error(e);
        }
    }

    // async updateOptionStock(newStock) {
    //     await this.getConnection();
    //
    //     this.update
    // }
};
