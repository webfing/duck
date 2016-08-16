/**
 * Store
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {
    var Store   = require('./Store')
    var net     = require('util/net')
    var router  = require('business/router')

    var StoreForGC = Store.extend({
        //提供给子类覆盖实现
        proxy: function(params, callback){
            var self = this;
            var path = self.server.indexOf("http")==0? self.server: '/cgi-bin/'+self.server;
            net.ajax({
                url: router.createUrl(path),
                data:{
                    module: self.module,
                    method: self.method,
                    param: params
                },
                plugins : {
                    'business/mergeRequest': true
                },
                cache: false,
                dataType: 'json',
                success: function(json) {
                    callback(null, json);
                },
                error: function(xhr, errorType, error) {
                    callback(error, errorType);
                }
            });
        }
    })

    return StoreForGC
})

