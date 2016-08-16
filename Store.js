/**
 * Store
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {
    var Base = require('./Base')
    var Event = require('./Event')

    var Store = Base.extend(Event, {
        __config:{
            params: {}
        },
        init:function(config){
            //自动保存配置项
            this.setUpConfig(config);
        },
        //提供给子类覆盖实现
        proxy: function(params, callback){

        },
        //提供给子类覆盖实现
        parse: function(data){

        },
        //提供给子类覆盖实现
        fetchFromCache: function(){

        },
        fetch: function(){
            var self = this
            this.fire('beforefetch');
            var cacheDeferr = self.fetchFromCache()
            if(cacheDeferr && cacheDeferr.when){
                return cacheDeferr
            }
            return new Promise(function(resolve, reject){
                self.proxy(self.get('params'), function(err, data){
                    if(!err){
                        resolve(data);
                    }else{
                        reject(data);
                    }
                    self.fire('afterfetch', data)
                })
            })
        },
        //定义销毁的方法，一些收尾工作都应该在这里
        destroy:function(){

        }
    })

    Store.fetch = function(stores){
        stores = Object.prototype.toString.call(stores) == '[object Array]'? stores: [stores];
        var promises = stores.map(function(item){
            return item.fetch();
        });
        return Promise.all(promises)
    }

    return Store
})

