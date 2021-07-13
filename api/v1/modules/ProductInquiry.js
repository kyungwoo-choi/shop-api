'use strict';
const Model = require('./Model');
const Product = require('./Product');
const User = require('./User');

module.exports = class ProductInquiry extends Model {
  constructor(props) {
    super(props);

    this.schema = 'GEC';
    this.table = 'product_inquiries';
  }

  getKeyName() {
    return 'product_inquiry_idx';
  }

  getKeyType() {
    return 'ai';
  }

  async getList(product_id) {
    await this.getConnection();

    const product = new Product();

    product.setKeyValue(product_id);
    const result = await this.findAll({
      hex_fields: ['user_id', 'product_id'],
      join: [{
        model: new User(),
        key: 'user_id'
      }],
      where: [
        ['product_id', await product.getQueryKeyValue()]
      ]
    });
    console.log(result);
    return result;
  }
};
