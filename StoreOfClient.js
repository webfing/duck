/**
 * Store
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {
    var StoreForGC = require('./StoreForGC')
    var cache 	= require('util/cacheData')
    var tools = require('./tools')

    var StoreOfClient = StoreForGC.extend({
        __config:{
            params: {},
            syncData: null
        },
        //提供给子类覆盖实现
        fetchFromCache: function(){
            var self = this, cacheData
            return new Promise(function(resolve, reject){
                if(cacheData = self.readSyncData()) {
                    resolve(cacheData)
                }else if(cacheData = self.readLocalStorageData()){
                    resolve(cacheData)
                }else {
                    reject(null)
                }
            })
        },
        readSyncData: function(){
            if(this.__memoryData) return this.__memoryData
            var syncDataCfg = this.get('syncData')
            if(!syncDataCfg) return
            return this.__memoryData = tools.namespace(window, 'syncData.DATA.'+syncDataCfg)
        },
        getCacheKey: function(){
            var keys = [this.get('server'), this.get('module'), this.get('method')]
            var params = this.get('params')
            for(var i in params) {
                if (params.hasOwnProperty(i)) {
                    keys.push(i+':'+params[i])
                }
            }
            return keys.join('_')
        },
        readLocalStorageData: function(){
            return cache.get(this.getCacheKey());
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

    //StoreOfClient.fetch = function(){}

    return StoreOfClient
})

