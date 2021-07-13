const Model = require('./Model');
const ProductReviewImage = require('./ProductReviewImage');
const User = require('./User');

module.exports = class ProductReviews extends Model {
  constructor(props) {
    super(props);

    this.schema = 'GEC';
    this.table = 'product_reviews';
  }

  getKeyName() {
    return 'product_review_idx';
  }

  getKeyType() {
    return 'ai';
  }

  async getList(product_id) {
    await this.getConnection();

    let result = {};
    result = await this.findAll({
      hex_fields: ['product_id', 'user_id'],
      join: [{
        model: new User(),
        key: 'user_id'
      }],
      where: [
        ['product_id', product_id]
      ]
    });

    for(const review of result) {
      review.images = [];

      const productReviewImage = new ProductReviewImage();
      productReviewImage.setConnection(this.connection);
      review.images = await productReviewImage.findAll({
        where: [
          ['product_review_idx', review.product_review_idx]
        ]
      });
    }

    return result;
  }
};
