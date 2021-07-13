'use strict';

const express = require('express');
const router = express.Router();

router.use('/products', require('./routes/products'));
router.use('/categories', require('./routes/categories'));
router.use('/users', require('./routes/users'));
router.use('/orders', require('./routes/orders'));
router.use('/stores', require('./routes/stores'));
router.use('/payments', require('./routes/payments'));
router.use('/bag', require('./routes/bag'));
router.use('/wishlist', require('./routes/wishlist'));
router.use('/promotions', require('./routes/promotions'));

module.exports = router;
