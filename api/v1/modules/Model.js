'use strict';

const _ = require('lodash');

const pool = require('../../databsae');
const config = require('../../../config');
const uuid = require('../../../utils/uuid');

module.exports = class Model {
    constructor(fields) {
        this.connection = null;

        this.fields = fields || {};
        this.table = '';
        this.schema = config.database.database || '';
    }

    setConnection(connection) {
        this.connection = connection;
    }

    async getConnection() {
        if (this.connection) {
            return this.connection;
        }

        this.connection = await pool.getConnection(async conn => conn);

        return this.connection;
    }

    getKeyType() {
        return 'uuid';
    }

    getKeyName() {
        return 'id';
    }

    setKeyValue(key) {
        if(this.getKeyType() === 'uuid') {
            // console.log('====================================')
            // console.log(key);
            key = key.toLowerCase();
        }

        this.fields[this.getKeyName()] = key;
    }

    async getQueryKeyValue() {
        let result;
        switch (this.getKeyType()) {
            case 'uuid':
                result = await uuid.toBuffer(await this.getKeyValue());
                break;
            case 'ai':
                result = await this.getKeyValue();
                break;
            default:
                break;
        }

        return result;
    }

    async getKeyValue() {
        let result;
        switch (this.getKeyType()) {
            case 'uuid':
                result = await uuid.decode(this.fields[this.getKeyName()]);
                break;
            case 'ai':
                result = this.fields[this.getKeyName()];
                break;
            default:
                break;
        }

        return this.fields[this.getKeyName()];
    }

    async generateKey() {
        if (this.getKeyType() !== 'uuid') {
            throw {
                message: 'this model key type is not uuid'
            }
        }

        this.fields[this.getKeyName()] = uuid.v1();
        this.fields[this.getKeyName()] = uuid.decode(this.fields[this.getKeyName()]);
        return await this.getKeyValue();
    }

    async buildWhere(where = []) {
        let _where = [];
        let _params = [];
        if (typeof (where) === 'object' && where.length) {
            for (const param of where) {
                switch (param.length) {
                    case 1:
                        break;

                    case 2:
                        _where.push(`${param[0]} = ?`);
                        _params.push(param[1]);

                        break;

                    case 3:
                        if (param[1] === 'in') {
                            let slot = [];

                            for (const p of param[2]) {
                                slot.push('?');
                                _params.push(p);
                            }

                            _where.push(`${param[0]} in (${slot.join(',')})`);
                        } else {
                            _where.push(`${param[0]} ${param[1]} ?`);
                            _params.push(param[2]);
                        }
                        break;

                    default:
                        throw {
                            message: 'buildWhere wrong'
                        };
                }
            }

            if (_where.length && _params.length) {
                _where = `where ${_where.join(' and ')}`;
            }
        }

        return {
            _where,
            _params
        }
    }

    async buildJoin(join = []) {
        let _join = [];
        let _columns = [];

        for (const obj of join) {
            _columns.push(` ${obj.model.table}.* `);
            _join.push(` inner join ${obj.model.schema}.${obj.model.table} on ${this.table}.${obj.key} = ${obj.model.table}.${obj.key} `)
        }

        return {
            _columns: _columns.length ? `, ${_columns.join(',')}` : '',
            _join: _join.join()
        };
    }

    async getHexUUID() {
        let hex = '';
        if (this.getKeyType() === 'uuid') {
            hex = `, LOWER(HEX(${this.table}.${this.getKeyName()})) as ${this.getKeyName()}`;
        }

        return hex;
    }

    async getHexFields(hex_fields) {
        if (!hex_fields.length) {
            return '';
        }

        let result = [];

        for (const field of hex_fields) {
            if (field instanceof Object) {
                if (field.table) {
                    result.push(`LOWER(HEX(${field.table}.${field.column})) as ${field}`)
                } else {
                    result.push(`LOWER(HEX(${this.table}.${field.column})) as ${field.column}`)
                }
            } else if (typeof (field) === 'string') {
                result.push(`LOWER(HEX(${this.table}.${field})) as ${field}`)
            }
        }

        if (result.length) {
            result = `, ${result.join(', ')}`
        } else {
            result = '';
        }

        return result;
    }

    async find({hex_fields = [], join = []}) {
        await this.getConnection();
        const key = this.getKeyName();

        const hex = await this.getHexUUID();

        let {_columns, _join} = await this.buildJoin(join);

        let query = `select ${this.table}.* ${_columns} ${hex} ${await this.getHexFields(hex_fields)} from ${this.schema}.${this.table} ${_join} where ${key} = ?`;

        let [rows] = await this.connection.query(query, [await this.getQueryKeyValue()]);
        if (!rows) {
            throw {
                message: '존재하지 않는 키 입니다.'
            }
        }

        if (!rows.length) {
            throw {
                message: 'no such data'
            }
        }

        this.fields = rows[0];

        this.fields[this.getKeyName()] = await this.getKeyValue();

        return this.fields;
    }

    async findAll({where = [], hex_fields = [], join = []}) {
        await this.getConnection();

        let {_where, _params} = await this.buildWhere(where);
        let {_columns, _join} = await this.buildJoin(join);

        const hex = await this.getHexUUID();

        let query = `select ${this.table}.* ${_columns} ${hex} ${await this.getHexFields(hex_fields)} from ${this.schema}.${this.table} ${_join} ${_where}`;
        let [rows] = await this.connection.query(query, _params);
        return rows;
    }

    async delete() {
        await this.getConnection();

        const key = this.getKeyName();

        this.fields[this.getKeyName()] = await this.getQueryKeyValue();

        let query = `delete from ${this.schema}.${this.table} where ${key} = ?`;

        let [rows] = await this.connection.query(query, [await this.getQueryKeyValue()]);

        return rows;
    }

    async deleteWhere({where}) {
        await this.getConnection();

        let {_where, _params} = await this.buildWhere(where);

        let query = `delete from ${this.schema}.${this.table} ${_where}`;

        let [rows] = await this.connection.query(query, _params);

        return rows;
    }

    async duplicateBuilder(duplicateUpdates = {}) {
        let result = [];
        for (const column in duplicateUpdates) {
            if (duplicateUpdates[column] === 'increase') {
                result.push(`${column} = ${column} + 1`)
            } else {
                result.push(`${column} = ${duplicateUpdates[column]}`);
            }
        }

        return result.length ? `on duplicate key update ${result.join(',')}` : '';
    }

    async save({onDuplicate = false, duplicateUpdates = {}}) {
        await this.getConnection();

        if (this.getKeyType() === 'uuid') {
            if (!this.fields[this.getKeyName()]) {
                await this.generateKey();
            }
        }

        const duplicate = await this.duplicateBuilder(duplicateUpdates);
        let query = `insert into ${this.schema}.${this.table} set ? ${duplicate}`;

        this.fields[this.getKeyName()] = await this.getQueryKeyValue();

        let [result] = await this.connection.query(query, [this.fields]);

        if (this.getKeyType() === 'uuid') {
            this.fields[this.getKeyName()] = await this.getKeyValue();
        } else {
            this.fields[this.getKeyName()] = result.insertId;
        }

        this.fields = await this.find({});

        return this.fields;
    }

    async bulkInsert({fields = [], values = []}) {
        await this.getConnection();

        let query = `insert into ${this.schema}.${this.table} (${fields.join(', ')}) values ?`;

        let [result] = await this.connection.query(query, [values]);

        return result;
    }

    async update(fields = null) {
        await this.getConnection();

        const key = this.getKeyName();

        const update_date = ', updated_at=CURRENT_TIMESTAMP()';

        let _fields = this.fields;

        if (fields) {
            _fields = fields;
        }

        this.fields[this.getKeyName()] = await this.getQueryKeyValue();
        let query = `update ${this.schema}.${this.table} set ? ${update_date} where ${key}=?`;
        await this.connection.query(query, [_fields, await this.getQueryKeyValue()]);

        this.fields = await this.find({});

        return this.fields;
    }

    async updateWhere(fields = null, where = []) {
        if (!where.length) {
            throw {
                message: 'where is empty'
            }
        }

        let _fields = this.fields;

        if (fields) {
            _fields = fields;
        }

        await this.getConnection();
        let {_where, _params} = await this.buildWhere(where);

        const update_date = ', updated_at=CURRENT_TIMESTAMP()';

        let query = `update ${this.schema}.${this.table} set ? ${update_date} ${_where}`;
        await this.connection.query(query, [_fields].concat(_params));
    }

    async destroy() {
        if (this.connection) {
            await this.connection.release();
        }
    }
};

