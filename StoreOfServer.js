/**
 * Store
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {
    var StoreForGC = require('./StoreForGC')
    var cache 	= require('util/cacheData')

    var StoreOfServer = StoreForGC.extend({
        __config:{
            params: {},
            syncData: null
        },
        //提供给子类覆盖实现
        parse: function(json){

        },
        update: function(){
            var self = this
            self.fire('beforefetch')
            return new Promise(function(resolve, reject){
                self.proxy(this.get('params'), function(err, json){
                    if(err){
                        resolve(self.__memorydata = self.parse(json))
                    }else{
                        reject(json)
                    }
                    this.fire('afterfetch', json)
                })
            })
        },
        //定义销毁的方法，一些收尾工作都应该在这里
        destroy:function(){

        }
    })

    return StoreOfServer
})

