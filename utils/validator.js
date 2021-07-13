'use strict';

const {validationResult, body, param, header} = require('express-validator');
const responsor = require(global.appRoot + '/common/responsor');

// 각 validation을 미리 정의하고
const _validations = {
    join: [
        body('email', 'check email field')
            .exists().withMessage('email is require')
            .isEmail().withMessage('이메일 형식이 아닙니다'),
        body('password')
    ],
    login: [
        body('email', 'check email field')
            .exists().withMessage('email is require')
            .isEmail().withMessage('이메일 형식이 아닙니다'),
        body('password')
    ],
    checkParamProductID: [
        param('product_id', 'check product_id')
            .isInt().withMessage('product_id is int')
    ],
    createCoupon: [
        header('store_id', 'check store_id')
            .exists().withMessage('store_id is require')
            .isInt().withMessage('store_id is int'),
        body('name')
            .exists().withMessage('name is require')
            .isString().withMessage('name is string'),
        body('type')
            .exists().withMessage('type is require')
            .isInt().withMessage('type is int'),
        body('sale')
            .exists().withMessage('sale is require')
            .isInt().withMessage('sale is int'),
        body('expire_date')
            .exists().withMessage('expire_date is require')
            .isString().withMessage('expire_date is string')
            .matches(/^(\d{4})-(\d{2})-(\d{2})/).withMessage('expire_date is date format (YYYY-MM-DD)')
    ],
    deleteCoupon:[
        header('store_id', 'check store_id')
            .exists().withMessage('store_id is require')
            .isInt().withMessage('store_id is int'),
        param('coupon_id')
            .exists().withMessage('coupon_id is require')
    ],
    getCouponList: [
        header('store_id', 'check store_id')
            .exists().withMessage('store_id is require')
            .isInt().withMessage('store_id is int')
    ],
    createOrder: [
        header('store_id', 'check store_id')
            .exists().withMessage('store_id is require')
            .isInt().withMessage('store_id is int'),
        body('order_name')
            .exists().withMessage('order_name is require'),
        body('orderer_name')
            .exists().withMessage('orderer_name is require'),
        body('orderer_email')
            .exists().withMessage('orderer_email is require'),
        body('orderer_mobile')
            .exists().withMessage('orderer_mobile is require'),
        body('receiver_name')
            .exists().withMessage('receiver_name is require'),
        body('receiver_mobile')
            .exists().withMessage('receiver_mobile is require'),
        body('receiver_address')
            .exists().withMessage('receiver_address is require'),
        body('receiver_address_detail')
            .exists().withMessage('receiver_address_detail is require'),
        body('receiver_zipcode')
            .exists().withMessage('receiver_zipcode is require')
            .isInt().withMessage('receiver_zipcode is int'),
        body('payment_method')
            .exists().withMessage('payment_method is require'),
        body('products')
            .exists().withMessage('products is require'),
        body('products.product_id')
            .exists().withMessage('products.product_id is require'),
            // .isInt().withMessage('products.product_id is int'),
        body('products.quantity')
            .exists().withMessage('products.quantity is require'),
            // .isInt().withMessage('products.quantity is int')
    ],
    prepareOrder: [
        header('store_id', 'check store_id')
            .exists().withMessage('store_id is require')
            .isInt().withMessage('store_id is int'),
        body('pg').exists().withMessage('pg is require'),
        body('payment_method').exists().withMessage('payment_method is require'),
        body('pay_price').exists().withMessage('pay_price is require'),
        body('shipping_fee').exists().withMessage('shipping_fee is require'),
        body('products_price').exists().withMessage('products_price is require'),
        body('orderer_email')
            .exists().withMessage('orderer_email is require')
            .isEmail().withMessage('이메일 형식이 아닙니다'),
        body('orderer_mobile')
            .exists().withMessage('orderer_mobile is require'),
        body('orderer_name')
            .exists().withMessage('orderer_name is require'),
    ],
    paymentsComplete: [
        header('store_id', 'check store_id')
            .exists().withMessage('store_id is require')
            .isInt().withMessage('store_id is int')
    ],
    getOrderDetail: [
        param('order_id')
            .exists().withMessage('order_id is empty')
    ]
};

// validate 실행시킴
const validate = (validation) => {
    const validations = _validations[validation];
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json(responsor.error({
            msg: 'request error',
            err: errors.array()
        }))
    };
};


module.exports = validate;
