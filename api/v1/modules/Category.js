'use strict';
const Model = require('./Model');

module.exports = class Category extends Model {
  constructor(props) {
    super(props);

    this.table = 'categories';
    this.schema = 'GEC';
  }

  getKeyName() {
    return 'category_id';
  }

  async extractChildrenCategoriesFromTree(categoryTree) {
    function joinChildren(children) {
      let tmp = [];
      for (const child of children) {
        tmp = tmp.concat(child.children);

        if (child.children && child.children.length) tmp = tmp.concat(joinChildren(child.children))
      }

      return tmp;
    }

    return joinChildren(categoryTree);
  }

  async makeCategoryTree(category_id = null) {
    const rows = await this.findAll({
      hex_fields: [
        'category_id',
        'parent_id'
      ]
    });

    let result = [];

    for (const row of rows) {
      row.children = [];
    }

    for (const row of rows) {
      if (category_id) {
        if (category_id === row.category_id) {
          result.push(row);
          continue;
        }
      } else {
        if (!row.parent_id) {
          result.push(row);
          continue;
        }
      }

      for (const category of rows) {
        if (category.category_id === row.parent_id) {
          category.children.push(row);
        }
      }
    }

    return result;
  }

  async checkLastCategory(category_id) {
    await this.getConnection();

    let rows = await this.findAll({
      where: [
        ['parent_id', category_id]
      ],
      hex_fields: [
        'category_id',
        'parent_id'
      ]
    });

    if (rows.length) {
      throw {
        message: '등록하려는 상품의 카테고리가 마지막 카테고리가 아닙니다.'
      }
    }

    return true;
  }

  async searchChildrenCategory(category_id) {
    let rows = await this.findAll({
      where: [
        [
          'category_id', category_id
        ]
      ],
      hex_fields: [
        'category_id',
        'parent_id'
      ]
    });

    if (!rows.length) {
      throw {
        message: '존재하지 않는 카테고리 입니다.'
      }
    }

    const row = rows[0];

    const findChildren = async (category_id) => {
      let result = [];

      let children = await this.findAll({
        where: [
          ['parent_id', category_id]
        ],
        hex_fields: [
          'category_id',
          'parent_id'
        ]
      });

      result = result.concat(children);

      for (const category of children) {
        const _children = await findChildren(category.category_id);
        result = result.concat(_children);
      }

      return result;
    };

    return await findChildren(row.category_id);
  }
};
