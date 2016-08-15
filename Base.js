/**
 * Base
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {
    var Class = require('./Class')
    var Event = require('./Event')

    var Base = Class.extend(Event, {
        CONFIG: {},
        setUpConfig: function(config){
            //自动保存配置项
            this.__config = Class.mix(this.CONFIG || {}, config)
        },
        init:function(config){
            this.setUpConfig(config);
        },
        //可以使用get来获取配置项
        get:function(key){
            return this.__config[key]
        },
        //可以使用set来设置配置项
        set:function(key,value){
            this.__config[key] = value
        },
        //定义销毁的方法，一些收尾工作都应该在这里
        destroy:function(){

        }
    })

    Base.defaultConfig = {}

    return Base
})

