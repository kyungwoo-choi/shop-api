'use strict';

const pool = require(global.appRoot + '/db');
const nodemailer = require('nodemailer');

const mailer = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hello@gra-fik.com',
        pass: 'Grfk!@0126'
    }
});

mailer.send = (options) => {
    return new Promise(async (resolve, reject) => {
        if (!options) {
            return reject({
                msg: 'options empty'
            })
        }

        if (!options.from) {
            return reject({
                msg: 'from empty'
            })
        }

        if (!options.to) {
            return reject({
                msg: 'to empty'
            })
        }

        if (!options.subject) {
            return reject({
                msg: 'subject empty'
            })
        }

        if (!options.text && !options.html) {
            return reject({
                msg: 'text or html empty'
            })
        }

        try {
            const sendMail = await transporter.sendMail(options);
            try {
                let connection = await pool.getConnection(conn => conn);

                try {
                    const query = `INSERT INTO GEC_LOGS.email_logs
                                   SET ?`;
                    const params = [options];
                    await connection.query(query, params);
                    connection.release();
                    return resolve(options, sendMail)
                } catch (err) {
                    console.error('db insert fail', err);
                    connection.release();
                    return reject(err);
                }
            } catch (err) {
                console.error('connection fail', err);
                return reject(err);
            }
        } catch (err) {
            console.error('sendMail fail', err);
            return reject(err);
        }
    })
};


module.exports = mailer;
