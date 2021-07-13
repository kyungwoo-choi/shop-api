'use strict';
const config = require('../config');
const axios = require('axios');
const iamport = {};

iamport.getAccessToken = async () => {
    try {
        const getToken = await axios({
            url: "https://api.iamport.kr/users/getToken",
            method: "post",
            headers: {"Content-Type": "application/json"},
            data: {
                imp_key: config.iamport.key,
                imp_secret: config.iamport.secret
            }
        });

        return getToken.data.response.access_token;
    } catch (e) {
        throw(e);
    }
};

iamport.getPaymentInfos = async (imp_uid) => {
    try {
        // 액세스 토큰(access token) 발급 받기
        const accessToken = await iamport.getAccessToken();

        // imp_uid로 아임포트 서버에서 결제 정보 조회
        const getPaymentData = await axios({
            url: `https://api.iamport.kr/payments/${imp_uid}`,
            method: "get", // GET method
            headers: {
                'Authorization': accessToken
            }
        });
        return getPaymentData.data.response;
    } catch (e) {
        // console.error(e);
        // return false;
        throw e;
    }
};

iamport.cancelPayment = async (cancelData) => {
    try {
        const accessToken = await iamport.getAccessToken();

        const {
            pg_uid,
            paid_amount,
            reason
        } = cancelData;

        /* 아임포트 REST API로 결제환불 요청 */
        const getCancelData = await axios({
            url: 'https://api.iamport.kr/payments/cancel',
            method: "post",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': accessToken // 아임포트 서버로부터 발급받은 엑세스 토큰
            },
            data: {
                reason, // 가맹점 클라이언트로부터 받은 환불사유
                imp_uid: pg_uid, // imp_uid를 환불 고유번호로 입력
                amount: paid_amount
            }
        });

        const {response} = getCancelData.data; // 환불 결과

        if (response === null && getCancelData.data.code) {
            throw {
                message: getCancelData.data.message
            }
        }

        return response;
    } catch (e) {
        console.error(e);
        throw e
    }
};

module.exports = iamport;
