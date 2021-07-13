const Model = require('./Model');

module.exports = class ProductReviewImage extends Model {
  constructor(props) {
    super(props);

    this.schema = 'GEC';
    this.table = 'product_review_images'
  }

  getKeyName() {
    return 'product_review_image_idx'
  }

  getKeyType() {
    return 'ai'
  }
};
