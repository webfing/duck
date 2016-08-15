/**
 * Store
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {
    var Store = require('./Store')
    var cacheData 	= require('util/cacheData')

    var StoreOfClient = Store.extend({
        CONFIG:{
            params: {}
        },
        init:function(config){
            //自动保存配置项
            this.setUpConfig(config);
            this.fetch()
        },
        //提供给子类覆盖实现
        proxy: function(params, callback){

        },
        //提供给子类覆盖实现
        parse: function(json){

        },
        //提供给子类覆盖实现
        fetchFromCache: function(){

        },
        fetch: function(){
            var self = this
            self.fire('beforefetch')
            return new Promise(function(resolve, reject){
                //首页从直出的数据中读取
                if(self.__syncData=self.fetchFromSnycData()){
                    resolve(self.parse(json))
                }
                self.proxy(this.get('params'), function(err, json){
                    if(err){
                        resolve(self.__memoryData = self.parse(json))
                    }else{
                        reject(json)
                    }
                    this.fire('afterfetch', json)
                })
            })
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

    Store.fetch = function(){}
})

