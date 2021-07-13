'use strict';
module.exports = class Responder {
    constructor(res) {
        this.res = res;
        this.status = 200;

        this.msg = '';
        this.error = false;
        this.success = false;
        this.data = null;
    }

    async send() {
        this.res.status(this.status).json({
            msg: this.msg,
            error: this.error,
            success: this.success,
            data: this.data
        })
    }

    setCookie(key, value) {
      if(!key || !value) return;
      this.res.cookie(key, value);
    }
};
