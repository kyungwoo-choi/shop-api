'use strict';

const Model = require('./Model');

const Product = require('./Product');
const PromotionProduct = require('./PromotionTarget');

const Category = require('./Category');
const PromotionCategory = require('./PromotionCategory');

const Brand = require('./Brand');
const PromotionBrand = require('./PromotionBrand');

const PromotionUseHistory = require('./PromotionUseHistory');

const uuid = require('../../../utils/uuid');

const moment = require('moment');


// const User = require('./User');

module.exports = class Promotion extends Model {
    constructor(props) {
        super(props);

        this.schema = 'gec_promotion';
        this.table = 'promotions'
    }

    getKeyName() {
        return 'promotion_idx'
    }

    getKeyType() {
        return 'ai'
    }

    async promotionProductSave(products = []) {
        await this.getConnection();

        const promotionProduct = new PromotionProduct();
        const product = new Product();

        promotionProduct.setConnection(this.connection);
        product.setConnection(this.connection);

        const targetList = [];

        for (let target of products) {
            product.setKeyValue(target.product_id);
            targetList.push(await product.getQueryKeyValue());
        }

        const result = await product.findAll({
            where: [
                [
                    'product_id', 'in', targetList
                ]
            ]
        });

        if (result.length !== products.length) {
            throw {
                message: '잘못된 상품번호가 존재합니다.'
            }
        }

        const values = [];
        for (const productData of products) {
            values.push([
                await this.getQueryKeyValue(),
                uuid.toBuffer(productData.product_id),
                productData.usable === undefined ? 0 : productData.usable
            ]);
        }

        if (values.length) {
            await promotionProduct.bulkInsert({
                fields: ['promotion_idx', 'promotion_product_id', 'usable'],
                values
            });
        }
    }

    async promotionCategorySave(categories = []) {
        await this.getConnection();

        const promotionCategory = new PromotionCategory();
        const category = new Category();

        promotionCategory.setConnection(this.connection);
        category.setConnection(this.connection);

        // for(const categoryData of categories) {
        // await category.searchChildrenCategory();
        // }

        const values = [];
        for (const categoryData of categories) {
            values.push([
                await this.getQueryKeyValue(),
                categoryData.category_id,
                categoryData.usable === undefined ? 0 : categoryData.usable
            ]);
        }

        if (values.length) {
            await promotionCategory.bulkInsert({
                fields: ['promotion_idx', 'promotion_category_id', 'usable'],
                values
            });
        }
    }

    async promotionBrandSave(brands = []) {
        await this.getConnection();

        const promotionBrand = new PromotionBrand();
        const brand = new Brand();

        promotionBrand.setConnection(this.connection);
        brand.setConnection(this.connection);

        // for(const brandData of brands) {
        // await brand.searchChildrenBrand();
        // }

        const values = [];
        for (const brandData of brands) {
            values.push([
                await this.getQueryKeyValue(),
                brandData.brand_id,
                brandData.usable === undefined ? 1 : brandData.usable
            ]);
        }

        if (values.length) {
            await promotionBrand.bulkInsert({
                fields: ['promotion_idx', 'promotion_brand_id', 'usable'],
                values
            });
        }
    }

    async generatePromotion(data = null) {
        await this.getConnection();

        this.fields.promotion_code = data.promotion_code;
        this.fields.promotion_name = data.promotion_name;
        this.fields.discount_type = data.discount_type;
        this.fields.discount = data.discount;
        this.fields.usable_discount_product = data.usable_discount_product;
        this.fields.expiration_date = data.expiration_date;

        await this.save({});

        await this.promotionProductSave(data.products);
        await this.promotionCategorySave(data.categories);
        await this.promotionBrandSave(data.brands);

        return await this.getQueryKeyValue();
    }

    async getPromotionDetail() {
        if (!this.fields.promotion_idx) {
            let rows = await this.findAll({
                where: [
                    ['promotion_code', this.fields.promotion_code]
                ]
            });

            if (!rows.length) {
                throw {
                    message: '존재하지 않는 프로모션 코드입니다.'
                }
            }

            this.fields = rows[0];
        }

        const promotionProduct = new PromotionProduct();
        const promotionCategory = new PromotionCategory();
        const promotionBrand = new PromotionBrand();

        promotionProduct.setConnection(this.connection);
        promotionCategory.setConnection(this.connection);
        promotionBrand.setConnection(this.connection);

        this.fields.products = await promotionProduct.findAll({
            where: [
                ['promotion_idx', this.fields.promotion_idx]
            ],
            hex_fields: [
                'promotion_product_id'
            ]
        });

        this.fields.categories = await promotionCategory.findAll({
            where: [
                ['promotion_idx', this.fields.promotion_idx]
            ]
        });

        this.fields.brands = await promotionBrand.findAll({
            where: [
                ['promotion_idx', this.fields.promotion_idx]
            ]
        });

        return this.fields;
    }

    async checkExpired() {
        const expirationDate = moment(this.fields.expiration_date).format('YYYYMMDDHHmmss');
        const todayDate = moment().format('YYYYMMDDHHmmss');

        if (+expirationDate < +todayDate) {
            throw {
                message: '죄송하지만, 현재 해당 프로모션은 종료되었습니다.'
            }
        }
    }

    // async applyPromotionToProducts(productList, targetProducts) {
    //     // 유효기간 검사
    //     // await this.checkExpired();
    //
    //     for (const product of productList) {
    //         // 상품, 카테고리, 브랜드 별 적용 가능여부가 설정되어있지 않으면 모든 상품 적용가능한 프로모션임.
    //         product.promotion_usable = false;
    //         product.promotion_price = 0;
    //         product.promotion_code = '';
    //
    //         if (!this.fields.products.length && !this.fields.categories.length && !this.fields.brands.length) {
    //             continue;
    //         }
    //
    //         // 상품, 카테고리, 브랜드 별 적용 불가여부 먼저 판단
    //         let flag = await this.checkUnusablePromotionToProduct(product);
    //         if (!flag) {
    //             continue;
    //         }
    //
    //         flag = await this.checkUsablePromotionToProduct(product);
    //         if(!flag) {
    //             continue;
    //         }
    //
    //         // 프로모션 가격 계산
    //         let productPromotionPrice;
    //
    //         // 세일가격 관련 내용과 옵션 추가가격 내용 추가되어야함 ****************
    //         let optionAddPrice = 0;
    //
    //         // for(const productOption of product.option.options) {
    //         //     if(productOption.option_id !== ) {
    //         //         continue
    //         //     }
    //         // }
    //
    //         if (this.fields.discount_type === 'rate') {
    //             productPromotionPrice = (product.cost + optionAddPrice) - ((product.cost + optionAddPrice) * (this.fields.discount / 100));
    //         } else if (this.fields.discount_type === 'price') {
    //             productPromotionPrice = (product.cost + optionAddPrice) - this.fields.discount;
    //             if (productPromotionPrice < 0) {
    //                 throw {
    //                     message: '프로모션 적용이 불가능합니다. (금액이 0이하로 떨어짐)'
    //                 }
    //             }
    //         }
    //
    //         product.promotion_usable = true;
    //         product.promotion_price = productPromotionPrice;
    //         product.promotion_code = this.fields.promotion_code;
    //     }
    //
    //     return productList;
    // }

    async applyPromotionToProduct(product, targetProduct) {
        // 유효기간 검사
        // await this.checkExpired();
        let result = {
            promotion_usable: false,
            promotion_price: 0,
            promotion_code: '',
            product_id: product.product_id
        };
        // 상품, 카테고리, 브랜드 별 적용 가능여부가 설정되어있지 않으면 모든 상품 적용가능한 프로모션임.
        // product.promotion_usable = false;
        // product.promotion_price = 0;
        // product.promotion_code = '';

        if (!this.fields.products.length && !this.fields.categories.length && !this.fields.brands.length) {
            return result;
        }

        // 상품, 카테고리, 브랜드 별 적용 불가여부 먼저 판단
        let flag = await this.checkUnusablePromotionToProduct(product);
        if (!flag) {
            return result;
        }

        flag = await this.checkUsablePromotionToProduct(product);
        if (!flag) {
            return result;
        }

        // 프로모션 가격 계산
        let productPromotionPrice;

        // 세일가격 관련 내용과 옵션 추가가격 내용 추가되어야함 ****************
        let optionAddPrice = 0;

        if(targetProduct.option_id) {
            for(const productOption of product.option.options) {
                if(productOption.option_id !== targetProduct.option_id) {
                    continue;
                }

                optionAddPrice = productOption.add_price || 0;
            }
        }

        let productPrice = (product.cost + optionAddPrice);

        if (this.fields.discount_type === 'rate') {
            productPromotionPrice = productPrice - (productPrice * (this.fields.discount / 100));
        } else if (this.fields.discount_type === 'price') {
            productPromotionPrice = productPrice - this.fields.discount;
            if (productPromotionPrice < 0) {
                throw {
                    message: '프로모션 적용이 불가능합니다. (금액이 0이하로 떨어짐)'
                }
            }
        }

        result.promotion_usable = true;
        result.promotion_price = productPromotionPrice;
        result.promotion_code = this.fields.promotion_code;

        return result;
    }

    async checkUsablePromotionToProduct(product) {
        let usable = 0;

        // 현재 상품이 현재 프로모션의 사용불가 상품목록에 있는지 검사
        for (const usableData of this.fields.products) {

            if (usableData.promotion_product_id !== product.product_id) {
                continue;
            }

            usable = usableData.usable;
            break;
        }

        // 현재 상품이 현재 프로모션의 사용불가 브랜드 목록에 있는지 검사
        for (const usableData of this.fields.brands) {
            if (usableData.promotion_brand_id !== product.brand_id) {
                continue;
            }

            usable = usableData.usable;
            break;
        }

        // 현재 상품이 현재 프로모션의 사용불가 카테고리 목록에 있는지 검사
        for (const usableData of this.fields.categories) {
            if (usableData.promotion_category_id !== product.category_id) {
                continue;
            }

            usable = usableData.usable;
            break;
        }

        return usable;
    }

    async checkUnusablePromotionToProduct(product) {
        let usable = 1;


        // 현재 상품이 현재 프로모션의 사용불가 상품목록에 있는지 검사
        for (const usableData of this.fields.products) {
            if (usableData.promotion_product_id !== product.product_id) {
                continue;
            }

            if (!usableData.usable) {
                usable = usableData.usable;
            }
            break;
        }

        // 현재 상품이 현재 프로모션의 사용불가 브랜드 목록에 있는지 검사
        for (const usableData of this.fields.brands) {
            if (usableData.promotion_brand_id !== product.brand_id) {
                continue;
            }

            if (!usableData.usable) {
                usable = usableData.usable;
            }
            break;
        }

        // 현재 상품이 현재 프로모션의 사용불가 카테고리 목록에 있는지 검사
        for (const usableData of this.fields.categories) {
            if (usableData.promotion_category_id !== product.category_id) {
                continue;
            }

            if (!usableData.usable) {
                usable = usableData.usable;
            }
            break;
        }

        return usable;
    }
};
