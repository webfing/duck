/**
 * 页面模块控制器类
 * 封装了模块的显示隐藏处理、图片的懒加载、模块的更新逻辑，数据存储操作；已及提供渲染成功和失败事件来解偶模块间的耦合
 * 模块支持的事件有：complete, error, rendered, afterfetch
 * 事件用法：
 * @param e 事件对象
 * @param ctl 当前控制器
 * @param data{Array} 数据
 * ctl.bind("afterfetch", function(e, ctl, data){
       //拉取到数据时触发
   });
    ctl.bind("error", function(e, ctl, data){
        //出错时触发
   });
    ctl.bind("rendered", function(e, ctl, data){
        //渲染成功时触发
   });
    ctl.bind("complete", function(e, ctl, data){
        //完成时触发，渲染成功和失败都会触发完成事件
   });
 * by kingpjchen 20160121
 */
define(function factory(require, exports, module) {

    var $ 			= require('lib/zepto');
    var Store		= require('frame/Store');
    var lazy		= require('business/lazy');
    require('frame/refreshHtml');

    var __id = 0;
    var noop = function(){};    //空函数

    /**
     * 控制器类
     * @param option
     * @constructor
     */
    function Controller(option){
        this._initOption(option);
        this._proxyEvent();

        this.id = ++__id;
        this.fetching = false;                  //标识符，表现数据还在获取中
        this.finishing = false;                 //标识符，本次逻辑已处理完

        //初始化时行先让整个模块隐藏
        $(this.option.container).hide();
        window._pageModule && (window._pageModule[this.option.name] = this);
    }

    Controller.defaultOps = {
        name: "name",                           //控制器名字，用于跟外部对接时的key
        container: "body",                      //模块的根dom节点，用来控制整个模块的显隐
        content: null,                          //模板计算完将填充到的dom节点,可以为空
        loadingHolder: null,                    //模块加载前loading占位符
        emptyHolder: null,                      //模块数据为空占位符
        tpl: noop,                              //模板渲染函数，注意是函数，这样便可以同时兼容游戏中心老的tlp模板和ejs的模块
        store: Store.getEmptyInstace(),         //该模块对应的数据源，可以为多个
        bid: "bid",							    //业务id
        refreshHtml: true,                      //是否开启refreshHtml插件，默认开启
        htmlCache: false,                       //是否开启html缓存，是的话渲染完后会缓存html
        parse: noop,                            //对cgi数据的逻辑处理函数，处理完成之后必须返回处理后的数据，以供内部的渲染处理逻辑
        addEvent: noop                          //绑定用户事件
    };

    var proto = Controller.prototype;

    /**
     * 处理option
     */
    proto._initOption = function(option){
        var opt = this.option = $.extend(true, {}, Controller.defaultOps, option);
        //如果未指定内容，则表明整个container就是渲染的填充层
        if(!opt.content){
            opt.content = opt.container
        }
        if(!$.isArray(opt.store)){
            opt.store = [opt.store];
        }
        this.container = $(opt.container);
        this.content = $(opt.content);
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

    /**
     * 入口方法
     * @param params 请求参数
     */
    proto.init = function(params){
        var that = this;
        that._parseParams(params);
        that._fetch();
        //一旦已经初始化，preload方法就不再有效果
        that.preload = noop;
        //保证只init一次
        that.init = noop;
    };

    /**
     * 直接使用数据来渲染
     * @param json
     */
    proto.renderByData = function(json) {
        var that = this;
        if (!json || this.rendered) return;
        that._parseResponse(json);
    };

    /**
     * 锁住视图刷新，避免用户交互后再更新视图
     */
    proto.lockRefreshView = function(){
        this.userInteracted = true;
    };

    /**
     * 预加载数据，但不做渲染
     * 用于模块一开始不展示，但是可以异步提前加载数据
     */
    proto.preload = function(params){
        var that = this;
        that._parseParams(params);
        that._fetch(true, true);
    };

    /**
     * 刷新视图，将强制拉cgi而非先使用缓存
     * @param params
     */
    proto.refresh = function(params){
        var that = this;
        params = params || that.option.params;
        that._parseParams(params);
        $.each(that.option.store, function(i, item){
            item._serverData = null;
        });
        that._fetch(false, true);
    };

    /**
     * 获取数据
     * @returns {void|*}
     */
    proto.getData = function(){
        return this.__data? $.extend(true, {}, this.__data): null;
    };

    /**
     * 对请求参数进行复制，避免内部和外部互相影响
     * @param params
     */
    proto._parseParams = function(params){
        var that = this;
        if($.isArray(params)){
            that.params = [];
            $.each(params, function(i, item){
                that.params.push($.isPlainObject(item)?$.extend(true, {}, item): item);
            });
        }else {
            that.params = $.extend(true, {}, params);
        }
    };

    /**
     * 拉取数据
     * @param preload
     * @param refresh
     * @private
     */
    proto._fetch = function(preload, refresh){
        var that = this;
        var params = this.params;
        var option = this.option;
        var chunkData;      //服务器以chunked方式返回的数据
        var callback = preload? noop: that._parseResponse;

        //在非提前加载数据的情况下，如果模块初始化，正在加载中，则直接退出
        if(!preload){
            if (that.fetching) return;
            that.fetching = true;
        }

        if(!refresh && window._moduleDataMap && (chunkData = window._moduleDataMap[option.name])){
            $.proxy(callback, that)(chunkData);
        }else{
            Store.fetchAll(option.store, params, $.proxy(callback, that), refresh, that);
        }
    };

    /**
     * 解析store返回的数据
     * @returns {Function}
     */
    proto._parseResponse = function(json){
        var that = this;
        that.fetching = false;
        //如果已经渲染过，并且用户已交互，则不再响应新的数据回来
        if(that.rendered && that.userInteracted) return;
        json = $.isArray(json)? json: [json];
        var option = that.option;
        //触发拉取数据成功
        that.trigger("afterfetch", [that, $.extend(true, {}, json)]);

        var data;       //json去壳后的data数据
        var renderData; //业务parse后给tpl的渲染数据

        //去壳json，取出有效的data
        data = that._unpackJson(json);

        //当过滤后的有效数据等于返回的json数组，说明所有store都返回了正确的数据，并且业务层的parse构子也正确返回了渲染数据
        if(data.length==json.length && (renderData = option.parse.apply(that, data))){
            that._render(renderData);
            //触发渲染成功事件
            that.trigger("rendered", [that, $.extend(true, {}, json)]);
            that.rendered = true;
            __singleCall(option.addEvent, that, $(option.container), $(option.content));
        }else{
            //本次没有可渲染的数据并且之前也没渲染过，则显示loading
            if(!that.rendered){
                option.loadingHolder && $(option.loadingHolder).hide();
                option.emptyHolder && $(option.emptyHolder).show();
            }
            //触发失败事件
            that.trigger("error", [that, $.extend(true, {}, json)]);
        }
        //触发完成事件
        that.trigger("complete", [that, $.extend(true, {}, json)]);
        that.finishing = true;
    };

    /**
     * json数据去壳
     * 过去，判断cgi吐出的数据是想要的数据，判断一般都很繁琐
     * if(json && json.data && json.result==0|| json.result==1101){}
     * 这里把这些繁琐的判断封装起来，只吐给业务处理好的数据
     * @private
     */
    proto._unpackJson = function (json) {
        var option = this.option;
        var acceptResultsArr = [];

        $.each(option.store, function(i, item){
            acceptResultsArr.push(item.option.acceptResults);
        });
        var result = [];
        $.each(json, function(i, item){
            if(item && ~$.inArray(item.result, acceptResultsArr[i]) && typeof item.data != undefined){
                result.push(item.data);
            }
        });
        return result;
    };

    /**
     * 渲染
     * @param data
     * @private
     */
    proto._render = function(data){
        this.__data = data;
        var option = this.option;
        var html = option.tpl(data);
        //dom写入方法，分常规html方式，refreshHtml刷新dom方式，apend追加方式
        var writeType = "html";
        //是否按刷新dom片方式更新html
        if(option.refreshHtml){
            writeType = "refreshHtml";
            $(option.content)[writeType](html, {
                htmlCache: option.htmlCache,          //是否开启html缓存
                bid: option.bid
            });
        }else{
            $(option.content)[writeType](html);
        }
        //loading模块或空模块隐藏
        option.loadingHolder && $(option.loadingHolder).hide();
        option.emptyHolder && $(option.emptyHolder).hide();
        //成功渲染之后，显示模块
        $(option.container).show();
        this.fetching = false;
        lazy.init();
    };

    /**
     * 单次调用函数
     * @param fn
     * @param context
     * @private
     */
    function __singleCall(fn, context){
        if(context.__singleCalled) return;
        context.__singleCalled = true;
        fn.apply(context, Array.prototype.slice.call(arguments, 2))
    }

    return Controller;

});
