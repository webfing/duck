/**
 * 集合类，封装数组的各种复杂取值操作，同时支持链式操作，简化业务逻辑代码
 * by kingpjchen 20160114
 *
 * 例子：
 * var games = new Collection(gameList)
 * games.orderBy("installed").get()             =》  按照是否安装排序并返回全部
 * games.orderBy("installed").first()           =》    按照是否安装排序并返回第一个
 * games.orderBy("installed").last()            =》    按照是否安装排序并返回最后一个
 * games.where("gameName", "全民突击").get()      =》    按照是否安装排序并返回最后一个
 * games.where("installed_time", ">", new Date().getTime())    =》    获取安装时间大开当前时间的集合
 * games.where("ctag", 1).orderBy("installer").toArrayByKey("appId")    =》  获取分类id为1，然后按照是否安装排序，再取得appid对应的值存为数组
 */


define(function factory(require, exports, module) {

    var $ = require('lib/zepto');

    /**
     * 集合类
     * @param data {Array} 数组
     * @constructor
     */
    function Collection(data){
        this.__data = data;
        this.init();
    }

    var proto = Collection.prototype;

    proto.init = function(){
        this.mapCache = {};
    };

    /**
     * 获取当前集合的成员个数
     * @returns {Number}
     */
    proto.count = function(){
        return this.__data.length;
    };

    /**
     * 跟据某个key，把所有对应值存成数组返回
     * @param key
     * @returns {Array}
     * @example
     * var games = new Collection(gameList)
     * games.toArrayByKey("appid") =》 [363, 1000001286, 100555390, 1104466820, 101019894]
     */
    proto.toArrayByKey = function(key){
        var tempArr = [];
        var data = this.get();
        $.each(data, function(i, item){
            tempArr.push(item[key]);
        });
        return tempArr;
    };

    /**
     * 获取集合成员
     * @param index {Number} 不传，获取全部集合，传值则获取相应下标成员
     * @returns {*}
     */
    proto.get = function(index){
        var tempData = $.extend(true, {}, this.__data);
        if(typeof index == "undefined"){
            return tempData;
        }
        return tempData[index];
    };

    proto.first = function(){
        return this.get(0);
    };

    proto.last = function(){
        return this.get(this.count()-1);
    };

    /**
     * 排序
     * @param field {string} 跟据哪个字段排序
     * @param type {string} 默认和desc为降序，asc为升序
     */
    proto.orderBy = function(field, type){
        var data = this.__data;
        var iteration = null;
        if(type=="asc"){
            iteration = function(a, b){
                return -((a[field] < b[field]) || -1);
            }
        }else{
            iteration = function(a, b){
                return (a[field] < b[field]) || -1;
            }
        }
        data.sort(iteration);
        return this;
    };

    /**
     * 集合成员查询方法
     * @param key
     * @param condition
     * @param value
     * @returns {*}
     * @example
     * var games = new Collection(gameList)
     * games.where("installed_time", ">", new Date().getTime())
     */
    proto.where = function(key, condition, value){
        var argLen = arguments.length;
        var data = this.__data;
        var iteration;
        var tempArr = [];
        if(argLen<2){
            return this.getData();
        }else if(argLen==2){
            value = condition;
            condition = "=";
        }
        switch (condition) {
            case "=":
                iteration = isEqual;
                break;
            case ">":
                iteration = isGreaterThan;
                break;
            case ">=":
                iteration = isGreaterThanOrIsEqual;
                break;
            case "<":
                iteration = isLessThan;
                break;
            case "<=":
                iteration = isLessThanOrIsEqual;
                break;
            case "in":
                iteration = contains;
                break;
            default :
                iteration = function(){}
        }
        $.each(data, function(i, item){
            if(iteration(item[key], value)){
                tempArr.push(item);
            }
        });
        return new Collection(tempArr);
    };

    /**
     * 将集合转成对象
     * 有的场景需要多次对集合的每一项进行配置，这时转成对象key-value加速配置速度
     * @param key
     * @returns {*}
     */
    proto.toMapByKey = function(key){
        var that = this;
        if (that.mapCache.key) return that.mapCache.key;
        var obj = that.mapCache.key = {};
        $.each(that.get(), function(i, item){
            var target = obj[item[key]];
            if(target){
                !$.isArray(target) && (target = [target]);
                target = target.push(item)
            }else{
                obj[item[key]] = item;
            }
        });
        return obj;
    };

    function isEqual(a, b){
        return a==b;
    }

    function isGreaterThan(a, b){
        return a>b
    }

    function isLessThan(a, b){
        return a<b
    }

    function isGreaterThanOrIsEqual(a, b){
        return isEqual(a, b) || isGreaterThan(a, b)
    }

    function isLessThanOrIsEqual(a, b){
        return isEqual(a, b) || isLessThan(a, b)
    }

    function contains(item, array){
        return ~$.inArray(item, array);
    }

    return Collection;

});