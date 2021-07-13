'use strict';

const path = require('path');

const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const config = require('../config');

const uuid = require('./uuid');

AWS.config.update({
    accessKeyId: config.upload.s3.credentials.accessKeyId,
    secretAccessKey: config.upload.s3.credentials.secretAccessKey,
    region: config.upload.s3.region
});

module.exports = class Uploader {
    constructor({paths = null, type = 'any', fieldsData = null, maxCount = null, key = ''}) {
        if (!paths) {
            throw {
                message: 'paths is empty'
            }
        }

        this.s3 = new AWS.S3();

        const uploadKey = `${config.paths[paths]}${key}`;

        this.upload = multer({
            storage: multerS3({
                s3: this.s3,
                bucket: config.upload.s3.bucket,
                key: async function (req, file, cb) {
                    const filename = uuid.decode(uuid.v1());
                    let extension = path.extname(file.originalname);
                    cb(null, uploadKey + filename + extension)
                }
            })
        });

        this.worker = this.upload[type](fieldsData, maxCount)
    }

    run(req, res) {
        if (!req || !res) {
            throw {
                message: 'request, response object must be passed'
            }
        }

        return new Promise((resolve, reject) => {
            this.worker(req, res, function (err) {
                if (err) {
                    return reject(err);
                }

                resolve({
                    req,
                    res
                });
            })
        });
    }
};
