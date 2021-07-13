'use strict';

const path =require('path');

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

const uploadProductImage = () => {
    let s3 = new AWS.S3();

    return multer({
        storage: multerS3({
            s3: s3,
            bucket: config.upload.s3.bucket,
            key: async function (req, file, cb) {
                const filename = uuid.decode(uuid.v1());
                let extension = path.extname(file.originalname);
                cb(null, config.paths.productImage + filename + extension)
            }
        })
    })
};


module.exports = {
    uploadProductImage
}
