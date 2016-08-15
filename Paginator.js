/**
 * 分页滚动加载模块控制器类
 * 封装分页的逻辑处理：
 * 分页去重，自动加载，加载完毕检验
 *
 * 如果分页依赖多个数据源store，请把分页用的store放第一个
 *
 * by kingpjchen 20160128
 */
define(function factory(require, exports, module) {

    var $ 			= require('lib/zepto');
    var Store		= require('frame/Store');
    var Controller	= require('frame/Controller');
    var lazy		= require('business/lazy');
    var frequent 	= require('util/frequent');

    var _id = 0;
    var noop = function(){};    //空函数

    /**
     * 控制器类
     * @param option
     * @constructor
     */
    function Paginator(option){
        this._initOption(option);
        this._proxyEvent();

        this.fetching = false;                  //标识符，表现数据还在获取中
        this.finishing = false;                 //标识符，表现分页已全部加载完成
        this._extInfoArr = null;                //是否已经有除分页接口之外的其它接口数据
        this.id = _id++;
        //一些情况下滚动时候不需要触发分页操作，例如单页多个滚动模块、滚动到第几屏后不再滚动加载等。默认情况下是不受限制的。如果受限制，请传钩子函数并且返回Boolean值
        this.scrollHook = $.isFunction(option.scrollHook) ? option.scrollHook : function(){return true;};
    }

    Paginator.defaultOps = {
        container: "body",                      //模块的根dom节点，用来控制整个模块的显隐
        content: null,                          //模板计算完将填充到的dom节点,可以为空
        tpl: noop,                              //模板渲染函数，注意是函数，这样便可以同时兼容游戏中心老的tlp模板和ejs的模块
        parse: noop,                            //对cgi数据的逻辑处理函数，处理完成之后必须返回处理后的数据，以供内部的渲染处理逻辑
        addEvent: noop,                         //绑定用户事件
        uiLoading: ".ui-loading-wrap",          //loading元素
        maxRetryTimes: 3,                       //调用接口失败或数据为空时的重试次数
        buffer: 30                              //滚动到底部的距离buffer
    };

    //继承自Controller
    Paginator.prototype = Object.create(Controller.prototype);
    Paginator.prototype.constructor = Paginator;

    var proto = Paginator.prototype;

    /**
     * 处理option
     */
    proto._initOption = function(option){
        var opt = this.option = $.extend(true, Paginator.defaultOps, option);
        //如果未指定内容，则表明整个container就是渲染的填充层
        if(!opt.content){
            opt.content = opt.container
        }
        if(!$.isArray(opt.store)){
            opt.store = [opt.store];
        }
        this.retryTimes = opt.maxRetryTimes;    //重试的次数
    };

    /**
     * 将挂在实例event属性下的事件代理到实例上
     * @private
     */
    proto._proxyEvent = function(){
        //自定义事件
        this.event = $({});
        //将事件代理到控制器上
        this.bind = $.proxy(this.event.bind, this.event);
        this.on = $.proxy(this.event.on, this.event);
        this.trigger = $.proxy(this.event.trigger, this.event);
    };

    proto.init = function(params){
        var that = this;
        var option = that.option;
        that.params = params || option.params;
        //第一次初始时行先让整个模块隐藏
        !that.rendered && $(option.container).hide();
        //如果分页控制器的第一个store不是分页store，则报错
        if(!option.store[0].option.pageInfo){
            throw "分页控制器的第一个store必须是分页store";
        }
        //初始化时在还没触发滚动时就要加载第一屏数据
        that._fetch();
        that._bindScrollEvent();
    };

    proto._fetch = function(){
        var that = this;
        var option = that.option;
        var params = that.params;

        //正在加载中，或已全部加载完成，则直接退出
        if (that.fetching || that.finishing) return;

        that.fetching = true;

        //如果是多个store的分页，并且除分页接口，其它store数据已经有了，就只拉分页接口的数据
        if(that._extInfoArr){
            Store.fetchAll(option.store[0], params, $.proxy(that._parseResponse, that), false, that);
        }else{
            Store.fetchAll(option.store, params, $.proxy(that._parseResponse, that), false, that);
        }

    };

    /**
     * 解析store返回的数据
     * @returns {Function}
     */
    proto._parseResponse = function(json){
        var that =this;
        var option = that.option;

        that.fetching = false;
        json = $.isArray(json)? json: [json];

        //触发拉取数据成功
        that.trigger("afterfetch", [that, $.extend(true, {}, json)]);

        var data;           //json去壳后的data数据
        var pagelist;       //分页store的list字段数据
        var renderData;     //业务parse后给tpl的渲染数据

        //去壳json，取出有效的data
        data = that._unpackJson(json);

        //如果有非分页之外的数据，再补上
        if(this._extInfoArr && this._extInfoArr.length){
            data = data.concat(this._extInfoArr);
        }

        //当过滤后的有效数据大于等于返回的json数组，说明所有store都返回了正确的数据，并且业务层的parse构子也正确返回了渲染数据
        if(data.length>=json.length && (renderData = option.parse.apply(that, data))){
            //如果是多个store的分页，并且还没有除分页之外的其它store的数据
            if(that.option.store.length>1 && !that._extInfoArr){
                that._extInfoArr = data.slice(1)
            }
            var is_end = data[0]["is_end"];
            //这里直接使用list字段即可，因为store里面已经将特定的分页字段转成list了
            pagelist = data[0]["list"];

            //分页结束，不再响应滚动加载
            if ( is_end ) that._destroy();

            //无数据结点，直返退出
            if (!pagelist) return that._destroy();

            //is_end未结束，但是数据过滤后为空，再重试
            if(!pagelist.length) return that._retry();

            that._render(renderData);
        }else{
            return that._retry();
        }
    };

    /**
     * 去重为空之后的重试
     * @private
     */
    proto._retry = function(){
        var that = this;
        that.retryTimes--;
        if(that.retryTimes<=0){
            that._destroy();
        }else{
            that.fetching = false;
            that._fetch();
        }
    };

    /**
     * 结束分页拉取
     * @private
     */
    proto._destroy = function(){
        var that = this;
        that._unBindScrollEvent();
        that.finishing = true;
        $(that.option.uiLoading).hide();
        //触发分页拉取结束事件
        that.trigger("complete", [that]);
    };

    proto._render = function(renderData){
        var that = this;
        var option = that.option;
        var html = option.tpl(renderData);
        option.content.append(html);
        that.retryTimes = option.maxRetryTimes;
        that.fetching = false;
        option.container.show();
    };

    proto._bindScrollEvent = function(){
        var that = this;
        $(window).bind("scroll."+that.id, frequent.throttle(function(){
        	if(!!that.scrollHook() === false){
        		return;
        	}
            if (document.body.scrollTop+$(window).height()+that.option.buffer>+$(document).height()){
                that._fetch();
            }
        }, 200));
    };

    proto._unBindScrollEvent = function(){
        var that = this;
        $(window).unbind("scroll."+that.id);
    };

    return Paginator;

});