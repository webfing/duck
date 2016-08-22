/**
 * Base
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {

    var RichBase = require('./RichBase')
    var Store = require('./Store')

    return RichBase.extend({
        __config: {
            store: null,
            parse: null
        },
        init:function(config){
            //存储配置项
            this.setUpConfig(config);
            //解析代理事件
            this._delegateEvent()
        },
        load: function(){
            var self = this
            var promise = Store.fetch(this.get('store'));

            promise.then(function(data){
                    self.setUp(data)
                })
                .catch(function(err){
                    self.setUp(null)
                })
        },
        //提供给子类覆盖实现
        setUp:function(data){
            var parse = this.get('parse');
            this.render(parse? parse.apply(this, data): data)
        }
    })

})

