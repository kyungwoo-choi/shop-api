'use strict';

const Model = require('./Model');
const generatePassword = require('../../../utils/generatePassword');
const crypto = require('../../../utils/crypto');
const jwt = require('../../../utils/jsonwebtoken');
const kakao = require('../../../utils/kakao');

const Bag = require('./Bag');
const Product = require('./Product');
const Option = require('./Option');

const UserSnsInformation = require('./UserSnsInformation');

module.exports = class User extends Model {
  constructor(props) {
    super(props);

    this.table = 'users';
    this.schema = 'GEC';
  }

  getKeyName() {
    return 'user_id';
  }

  async join({email = '', password = '', name = '', phone_number = '', gender = 1, sns = null, oauth_key = null}) {
    await this.getConnection();

    await this.connection.beginTransaction();

    try {
      let rows = await this.findAll({
        where: [
          ['email', email]
        ]
      });

      if (rows.length) {
        throw {
          message: '중복된 이메일입니다.'
        }
      }

      if (!sns) {
        let encodedPassword = await generatePassword(password);
        this.fields.password = encodedPassword.password;
        this.fields.salt = encodedPassword.salt;
      }

      await this.generateKey();

      this.fields.email = email;
      this.fields.name = name;
      this.fields.phone_number = phone_number;
      this.fields.sns = sns;
      this.fields.gender = gender;
      this.fields.authentication_token = await jwt.sign({
        email: email
      });

      // sns회원가입시 정보 처리
      if (sns) {
        const userSnsInformation = new UserSnsInformation();

        userSnsInformation.setConnection(this.connection);

        userSnsInformation.fields.user_id = await this.getQueryKeyValue();
        userSnsInformation.fields.sns = sns;
        userSnsInformation.fields.oauth_key = oauth_key;

        await userSnsInformation.save({});
      }

      await this.save({});
      await this.connection.commit();
    } catch (e) {
      await this.connection.rollback();
      throw e;
    }
  }

  async issueAccessToken(payload = null) {
    return await jwt.sign(payload);
  }

  async snsSignin({token = null, sns = null}) {
    await this.getConnection();

    let userData = null;

    try {
      userData = await kakao.getUserInformation(token);
      console.log(userData);
    } catch (e) {
      console.log('occurred error while get user data from kakao');
      throw e;
    }

    const snsInformation = new UserSnsInformation();
    snsInformation.setConnection(this.connection);

    let userSnsInformation = await snsInformation.findAll({
      where: [
        ['oauth_key', userData.id]
      ]
    });

    if (!userSnsInformation.length) {
      throw {
        message: '해당 SNS로 로그인된 유저가 아닙니다. 가입하시겠습니까?'
      }
    }

    userSnsInformation = userSnsInformation[0];

    let rows = await this.findAll({
      where: [
        ['user_id', userSnsInformation.user_id]
      ]
    });

    if (!rows.length) {
      throw {
        message: '존재하지 않는 회원입니다.'
      }
    }

    const row = rows[0];

    // if (row.status === 'ready') {
    //     throw{
    //         message: '대기상태의 회원입니다. 이메일 인증을 먼저 해주세요.'
    //     }
    // }

    delete row.password;
    delete row.salt;
    delete row.authentication_token;

    return await this.issueAccessToken({
      user_id: row.user_id,
      email: row.email,
      name: row.name,
      status: row.status,
      phone_number: row.phone_number,
      sns: row.sns,
      position: 'member'
    });
  }

  async signin({email = '', password = ''}) {
    await this.getConnection();

    let rows = await this.findAll({
      where: [
        ['email', email]
      ]
    });

    if (!rows.length) {
      throw {
        message: '존재하지 않는 이메일입니다.'
      }
    }

    const row = rows[0];

    if (row.password !== await crypto.checkPassword(password, row.salt)) {
      throw {
        message: '잘못된 패스워드 입니다.'
      }
    }

    // if (row.status === 'ready') {
    //     throw{
    //         message: '대기상태의 회원입니다. 이메일 인증을 먼저 해주세요.'
    //     }
    // }

    delete row.password;
    delete row.salt;
    delete row.authentication_token;

    return await this.issueAccessToken({
      user_id: row.user_id,
      email: row.email,
      name: row.name,
      status: row.status,
      phone_number: row.phone_number,
      position: 'member'
    });
  }

  async authenticate(token) {
    await this.getConnection();

    const decoded = await jwt.verification(token);
    this.setKeyValue(decoded.user_id);
    const rows = await this.findAll({
      where: [
        ['user_id', await this.getQueryKeyValue()],
        ['email', decoded.email]
      ]
    });

    if (!rows.length) {
      throw {
        message: '잘못된 이메일입니다.'
      }
    }

    return rows[0];
  }

  async addBag({product_id, option_id, quantity = 0}) {
    await this.getConnection();

    const queryKey = await this.getQueryKeyValue();

    const bag = new Bag();
    const product = new Product();
    const option = new Option();

    bag.setConnection(this.connection);
    product.setConnection(this.connection);
    option.setConnection(this.connection);

    product.setKeyValue(product_id);
    option.setKeyValue(option_id);

    bag.fields.user_id = queryKey;
    bag.fields.product_id = await product.getQueryKeyValue();
    bag.fields.option_id = await option.getQueryKeyValue();
    bag.fields.quantity = quantity;

    return bag.save({
      onDuplicate: true,
      duplicateUpdates: {
        quantity: `quantity + ${quantity}`
      }
    });
  }

  async getUserBagItems() {
    await this.getConnection();

    const queryKey = await this.getQueryKeyValue();

    const bag = new Bag();

    bag.setConnection(this.connection);
    return await bag.getBagItems(queryKey);
  }
};
