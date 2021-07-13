'use strict';

const axios = require('axios');

const apiKey = 'ea16ca2ffec1446d67c5ca94a5cfe4aa';
const appId = 402827;

module.exports = {
    async getUserInformation(token) {
        try {
            const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;
        } catch (e) {
            throw e
        }
    },
    async getAccessToken() {

    }
};
