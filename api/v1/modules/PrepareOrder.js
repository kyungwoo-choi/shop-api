'use strict';
const Model = require('./Model');
const Product = require('./Product');
const OrderProduct = require('./OrderProducts');
const Option = require('./Option');
const ProductImage = require('./ProductImage');
const Payment = require('./Payment');
const Promotion = require('./Promotion');

const {getPaymentInfos, cancelPayment} = require('../../../utils/iamport');

const moment = require('moment');

module.exports = class PrepareOrder extends Model {
  constructor(props) {
    super(props);

    this.schema = 'GEC_ORDER';
    this.table = 'prepare_orders';
  }

  getKeyName() {
    return 'order_id'
  }

  async getOrderProducts() {
    const orderProduct = new OrderProduct();
    orderProduct.setConnection(this.connection);

    const products = await orderProduct.findAll({
      where: [
        ['order_id', await this.getQueryKeyValue()]
      ],
      hex_fields: [
        'product_id',
        'order_id',
        'option_id'
      ]
    });

    for (const orderProduct of products) {
      const option = new Option();
      const productImage = new ProductImage();
      const product = new Product();

      option.setConnection(this.connection);
      productImage.setConnection(this.connection);
      product.setConnection(this.connection);

      orderProduct.option = {};

      option.setKeyValue(orderProduct.option_id);
      orderProduct.option = await option.find({
        hex_fields: [
          'product_id',
          'option_id'
        ]
      });

      product.setKeyValue(orderProduct.product_id);
      const images = await productImage.findAll({
        where: [
          ['product_id', await product.getQueryKeyValue()]
        ],
        hex_fields: [
          'product_id'
        ]
      });

      orderProduct.image = images[0];
    }

    return products;
  }

  async show(user_id) {
    await this.getConnection();

    let rows = await this.findAll({
      where: [
        ['user_id', user_id],
        ['order_id', await this.getQueryKeyValue()]
      ],
      hex_fields: ['order_id', 'user_id']
    });

    if (!rows.length) {
      throw {
        message: '???????????? ?????? ?????? ???????????????.'
      }
    }

    this.fields = rows[0];

    // ?????? ????????????
    this.fields.products = await this.getOrderProducts();

    // ?????? ??????
    const payment = new Payment();

    payment.setConnection(this.connection);

    try {
      let paymentData = await payment.findAll({
        where: [
          ['order_id', await this.getQueryKeyValue()]
        ],
        hex_fields: [
          'order_id'
        ]
      });

      if (!paymentData.length) {
        this.fields.payment = null;
      } else {
        this.fields.payment = paymentData[0];
      }

    } catch (e) {
      console.error(e);
      this.fields.payment = null;
    }

    return this.fields
  }

  // ?????? ??????
  async create(user_id, data) {
    await this.getConnection();
    await this.connection.beginTransaction();

    await this.generateKey();

    this.fields.user_id = user_id;
    this.fields.orderer_name = data.name;
    this.fields.orderer_mobile = data.mobile;
    this.fields.orderer_email = data.email;
    this.fields.address = data.address;
    this.fields.address_detail = data.addressDetail;
    this.fields.postal_code = data.postalCode;

    this.fields.amount = 0;

    // ???????????? ????????? ?????? ???????????? ????????? ???????????? ????????????
    let promotionUsed = false;
    const promotion = new Promotion();
    promotion.setConnection(this.connection);

    // ??????????????? ???????????? ????????? ?????????
    if (data.promotion_code) {
      let rows = await promotion.findAll({
        where: [
          ['promotion_code', data.promotion_code]
        ]
      });

      if (!rows.length) {
        throw {
          message: '???????????? ?????? ???????????? ???????????????.'
        }
      }

      promotion.fields = rows[0];

      // ?????? ???????????? ?????? ?????????
      await promotion.getPromotionDetail();

      // ???????????? ??????
      await promotion.checkExpired();
    }

    for (const orderProductData of data.products) {
      const product = new Product();

      product.setConnection(this.connection);
      product.setKeyValue(orderProductData.product_id);

      const option = new Option();
      option.setConnection(this.connection);

      const orderProduct = new OrderProduct();
      orderProduct.setConnection(this.connection);

      const orderProductDetail = await product.getDetail();

      for (const orderProductOption of orderProductDetail.option.options) {
        if (orderProductOption.option_id === orderProductData.option_id) {
          option.setKeyValue(orderProductOption.option_id);
        }
      }

      const option_id = await option.getKeyValue();
      if (!option_id) {
        throw {
          message: '????????? ?????? ???????????????.'
        }
      }

      await option.find({});

      if (option.fields.stock - orderProductData.quantity < 0) {
        throw {
          message: '????????? ???????????????.'
        }
      }

      orderProduct.fields.order_id = await this.getQueryKeyValue();
      orderProduct.fields.product_id = await product.getQueryKeyValue();
      orderProduct.fields.option_id = await option.getQueryKeyValue();

      orderProduct.fields.product_name = product.fields.name;

      // ????????????
      orderProduct.fields.product_price = product.fields.cost + option.fields.add_price;
      orderProduct.fields.quantity = orderProductData.quantity;

      // ???????????? ?????? ??????
      if (data.promotion_code) {
        const promotionData = await promotion.applyPromotionToProduct(orderProductDetail, orderProductData);

        orderProduct.fields.promotion_use = 1;
        orderProduct.fields.promotion_code = promotionData.promotion_code;
        orderProduct.fields.promotion_price = promotionData.promotion_price;
      }

      // ?????? ??? ?????? (???????????? ?????????)
      orderProduct.fields.total_product_price = orderProduct.fields.product_price * orderProductData.quantity;

      // ????????????
      orderProduct.fields.pay_price = orderProduct.fields.total_product_price;

      // ???????????? ????????? ??????????????? ???????????? ???????????? ?????? ??????
      if (orderProduct.fields.promotion_code) {
        // ??????????????? ????????? ????????? ???????????? ????????? use_history??? ??????
        promotionUsed = true;
        orderProduct.fields.pay_price = orderProduct.fields.promotion_price * orderProductData.quantity;
      }

      orderProduct.fields.status = 'paid';
      // orderProduct.fields.shipping_step = 'ready';

      console.log(orderProduct.fields);
      // orderProduct.fields.status = '';

      // ??? ?????? ?????? ??????
      this.fields.amount += orderProduct.fields.pay_price;

      // ?????? ?????? ?????? ????????????
      option.fields.stock -= orderProductData.quantity;
      option.fields.order_stock += orderProductData.quantity;

      await option.update();

      await orderProduct.save({});
    }

    if (data.promotion_code) {
      if (!promotionUsed) {
        throw {
          message: '?????? ????????? ????????? ??? ?????? ?????????????????????.(?????? ??????????????? ???????????? ????????? ??????)'
        }
      }
    }

    await this.save({});

    await this.connection.commit();

    return await this.getKeyValue();
  }

  unixTimestampToDatetime(timestamp) {
    return moment(new Date(timestamp * 1000)).format('YYYY-MM-DD HH:mm:ss')
  }

  // ?????? ??????
  async cancelOrderPayment(user_id, reason = null) {
    await this.find({});

    const payment = new Payment();
    payment.setConnection(this.connection);

    const payments = await payment.findAll({
      where: [
        ['order_id', await this.getQueryKeyValue()]
      ],
      hex_fields: [
        'order_id'
      ]
    });

    if (!payments.length) {
      throw {
        msg: '?????? ????????? ??????????????? ???????????? ????????????.'
      }
    }

    payment.fields = payments[0];

    let cancelData = {
      reason: reason ? reason : '????????? ?????? ??????',
      pg_uid: payment.fields.pg_uid,
      paid_amount: payment.fields.paid_amount
    };

    try {
      await cancelPayment(cancelData);

      await this.connection.beginTransaction();

      await payment.update({
        status: 'cancelled'
      });

      await this.update({
        order_status: 'cancelled'
      });

      const orderProduct = new OrderProduct();

      orderProduct.setConnection(this.connection);
      const orderProducts = await orderProduct.findAll({
        where: [
          ['order_id', await this.getQueryKeyValue()]
        ],
        hex_fields: [
          'order_id',
          'product_id',
          'option_id'
        ]
      });

      const option = new Option();
      option.setConnection(this.connection);

      for (const product of orderProducts) {
        option.setKeyValue(product.option_id);

        await option.connection.query(`
                    update ${option.schema}.${option.table} 
                        set
                        \`stock\` = \`stock\` + ?,
                        \`order_stock\` = \`order_stock\` - ?
                    where option_id = ?
                `, [product.quantity, product.quantity, await option.getQueryKeyValue()])
      }

      await this.connection.commit();
    } catch (e) {
      await this.connection.rollback();
      throw e
    }
  }

  // ??????????????? ?????????????????? ???????????? ??????????????? ?????????
  async reflectPaymentData(user_id, imp_uid) {

    await this.show(user_id);

    // if (this.fields.payment.payment_idx) {
    //   throw {
    //     message: '?????? ????????? ??????????????????.'
    //   }
    // }

    // ?????????????????? ???????????? ??????
    const paymentData = await getPaymentInfos(imp_uid);

    if (!paymentData) {
      throw {
        message: '??????????????? ???????????? ??????????????????.'
      }
    }

    let amountToBePaid = 0; // ?????? ????????? ?????? ??????

    for (const orderProduct of this.fields.products) {
      amountToBePaid += orderProduct.pay_price;
    }

    // ?????? ????????????
    const {amount, status} = paymentData;
    if (amount === amountToBePaid) { // ?????? ?????? ??????. ?????? ??? ?????? === ?????? ????????? ?????? ??????
      try {
        await this.connection.beginTransaction();
        const payment = new Payment();

        payment.setConnection(this.connection);

        payment.fields.order_id = await this.getQueryKeyValue();
        payment.fields.pg_uid = paymentData.imp_uid;
        payment.fields.msg = paymentData.msg;
        payment.fields.pay_method = paymentData.pay_method;
        payment.fields.paid_amount = paymentData.amount;
        payment.fields.status = paymentData.status;
        payment.fields.payment_name = paymentData.name;
        payment.fields.pg_provider = paymentData.pg_provider;
        payment.fields.pg_tid = paymentData.pg_tid;
        payment.fields.pg_id = paymentData.pg_id;
        payment.fields.buyer_name = paymentData.buyer_name;
        payment.fields.buyer_email = paymentData.buyer_email;
        payment.fields.buyer_tel = paymentData.buyer_tel;
        payment.fields.buyer_addr = paymentData.buyer_addr;
        payment.fields.buyer_postcode = paymentData.buyer_postcode;
        payment.fields.paid_at = this.unixTimestampToDatetime(paymentData.paid_at);
        payment.fields.receipt_url = paymentData.receipt_url;
        payment.fields.apply_num = paymentData.apply_num;
        payment.fields.vbank_num = paymentData.vbank_num;
        payment.fields.vbank_name = paymentData.vbank_name;
        payment.fields.vbank_holder = paymentData.vbank_holder;
        payment.fields.vbank_date = paymentData.vbank_date;

        await payment.save({});

        if (status === 'paid') {
          this.fields.order_status = 'paid';
          await this.update({
            order_status: this.fields.order_status
          })
        }

        await this.connection.commit();

        return payment;
      } catch (e) {
        console.error(e);
        await this.connection.rollback();
      }
    } else {
      throw {
        message: "????????? ????????????"
      };
    }
  }
};

