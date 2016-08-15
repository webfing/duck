/**
 * Base
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {

    var RichBase = require('./RichBase')
    var Store = require('./Store')

    return RichBase.extend({
        CONFIG: {
            store: null
        },
        init:function(config){
            //存储配置项
            this.setUpConfig(config);
            //解析代理事件
            this._delegateEvent()
            this._fetch()
        },
        _fetch: function(){
            var self = this
            Store.fetch(this.get('store'))
                .then(function(data){
                    self.setUp(data)
                })
                .fail(function(err){
                    self.setUp(null)
                })
        },
        //提供给子类覆盖实现
        setUp:function(){
            this.render()
        }
    })

})

