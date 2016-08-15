/**
 * 数据存储类
 * 封装了缓存的管理，使业务只用关心数据读取
 * by kingpjchen 20160108
 */
define(function(require, exports, module){

	var router 		= require('business/router'),
		cacheData 	= require('util/cacheData'),
		frequent 	= require('util/frequent'),
		$ 			= require('lib/zepto'),
		net     	= require('util/net');

	var Store = function (option){
		this.option = $.extend(true, {}, Store.defaultOps, option);
		if(!option.pageInfo){
			delete this.option.pageInfo;
		}
		if(this.option.pageInfo){
			this._pageKeyMap = {};
		}
	};

	/**
	 * 默认参数，放在类公共属性上，方便业务定制化
	 */
	Store.defaultOps = {
		server: "",							//cgi请求路径
		module: "",							//cgi请求module
		method: "",							//cgi请求method
		bid: "bid",							//业务id
		pageInfo: {							//如果不需要分页，直接设为null
			index: 0,						//分页起始下载
			size: 10,						//分页中一页的数量，如果为0说明不分页
			listKey: "list",				//分页字段健值
			unique: null					//分页list唯一健值
		},
		acceptResults: [0],					//正确的接口返回result
		update: false,						//是否强制更新，即不使用缓存
		lazyRefresh: true					//是否使用懒更新，如果使用懒更新，会在有缓存的情况下立马使缓存，然后不够缓存是否过期，再去拉cgi，并回调
	};

	//-----------------------------以下为类方法---------------------------

	/**
	 * 获取空的store实例
	 * @returns {Store}
	 */
	Store.getEmptyInstace = function(){
		var store =  new Store({});
		store.fetch = function(){};
		return store;
	};

	/**
	 * 异步获取多个store数据，并做一次返回
	 * 这对于一个业务需要多个store，并且需要全部store获取到之后才能处理的情况非常有用
	 * A 当所有store都拿到了数据，执行一性回调
	 * B 当所有store的刷新回调拿到了服务器新数据，再执行一性回调
	 * @param stores	Store实例数组
	 * @param params	参数数组
	 * @param callback	全部成功后的回调
	 * @param refresh	是否直接拉cgi数据
	 * @param context	回调函数上下文对象
	 */
	Store.fetchAll = function(stores, params, callback, refresh, context){
		//如果是单个，则转成[xx]的方式
		if(stores instanceof Store){
			stores = [stores];
		}
		var jsons = [];
		var len = stores.length;
		var render = false;
		var timer = null;		//计时器
		var results = new Array(len);		//哨兵变量，用来记录各store是否回调成功
		var succeeStr = new Array(len+1).join("1");
		$.each(stores, function(i, item){
			if(item instanceof Store){
				_fetch(item, i);
			}else{
				console.warn("Store.fetchAll params of stores is not Store instance");
			}
		});
		function _fetch(item, i){
			var param = $.isArray(params)? params[i]: params;
			item.fetch(param || {}, function(json){
				jsons[i] = json;
				results[i] = 1;
				_done();
			}, refresh, context)
		}
		function _done(){
			//当所有store回调都已完成，才进行总的回调
			if(results.join("")==succeeStr){
				if(render){
					/**
					 * 每个store回调可能会有两个（缓存数据回调，服务器数据回调）
					 * 这里如果同时有n个store一共最多会回调n+1次，为了避免频繁刷新视图，采用定时0.3秒统一刷新
					 * @type {number}
					 */
					throttle(jsons);
				}else{
					callback && callback.call(context, jsons);
				}
				render = true;
			}
		}
		var throttle = frequent.throttle(callback, 300);
	};

	var proto = Store.prototype;

	//--------------------------以下为实例方法-----------------------------------

	/**
	 * 设置业务id
	 * 比如一个cgi会根据参数的同不返回不同数据，这时就可以把这些参数组装成业务id，进而分别缓存起来
	 * @param bid
	 */
	proto.setBid = function(bid){
		this.option.bid = $.isArray(bid)? bid.join("_"): bid;
	};

	/**
	 * 提取数据
	 * @param params cgi参数
	 * @param callback
	 * @param update
	 * * @param context	回调函数上下文对象
	 */
	proto.fetch = function(params, callback, update, context){
		var that = this;
		var option = that.option;
		if(typeof update == "undefined"){
			update = option.update
		}
		var cacheKey = that._getCacheKey();
		var lazyRefresh = option.lazyRefresh;
		var json;
		
		//分页信息处理
		params = that.parseParams(params);
		that._parmas = params;

		//如果是分页，则直接走拉服务器数据分支
		that.option.pageInfo && (update = true);

		if( !update ){
			//如果内存中的有数据，则说明已经拉取过该接口，直接使用内存中数据
			if(that._serverData){
				return callback && callback.call(context, that._serverData );
			}else if( json = cacheData.get( cacheKey ) ){
				//如果是缓存的数据，则立即使用缓存数据先渲染一遍
				callback && callback.call(context, json );
				that._cacheData = json;

				//如果已经过期了或者设置了懒更新，就去考虑是否要更新
				if( lazyRefresh ){
					//设置一个100秒延时，避免跟没有缓存的cgi合并
					setTimeout(function(){
						/**
                         * 因为有0.1秒延时，也许在这个过程中，serverData已经拿到了，所以这里再判断一次
						 * 如果有了serverData，则直接使用serverData做一次渲染
						 * 如果没有，则去拉服务器数据再做渲染
						 */
						if(that._serverData){
							return callback && callback.call(context, that._serverData );
						}else{
							that.fetchFromServer(params, callback, false, context );
						}
					}, 100)
				}
			}else{
				that.fetchFromServer( params, callback, true, context );
			}
		}else{
			//如果是非分页，并且内存中的有数据，则说明已经拉取过该接口
			if(!that.option.pageInfo && that._serverData) {
				return callback && callback.call(context, that._serverData);
			}
			that.fetchFromServer( params, callback, true, context );
		}
	};

	/**
	 * 获取缓存中的数据
	 */
	proto.getCacheData = function(){
		return this._cacheData || cacheData.get(this._getCacheKey());
	};

	/**
	 * 清除缓存中的数据
	 */
	proto.clearCacheData = function(){
		cacheData.set(this._getCacheKey(), null);
	};

	/**
	 * 获取已获取到的服务器端数据
	 */
	proto.getServerData = function(){
		return this._serverData;
	};

	/**
	 * 获取已获取到的数据（服务器端｜缓存端）
	 */
	proto.getData = function(){
		return this.getServerData() || this.getCacheData();
	};

	/**
	 * 主动刷新缓存
	 * 在提交数据后可以主动调用一次该方法从服务器拉数据刷新缓存而不触发页面演染
	 * @param params
	 */
	proto.updateCache = function(params){
		this.fetchFromServer(params || this._parmas, function(){}, true);
	};

	/**
	 * 显示数据刷新日志
	 */
	proto._showRefreshLog = function(){
		var opt = this.option;
		console.log(new Array(30).join("-")+'Store refresh:'+[opt.server, opt.module, opt.method].join("/"));
	};

	/**
	 * 分页数据去重
	 * @param list
	 * @returns {*}
     * @private
     */
	proto._filter = function(list){
		var that = this;
		var option = that.option;
		var unique = option.pageInfo.unique;

		var filterData = [];
		if(!unique) return list;
		$.each(list, function (index, item){
			if (!that._pageKeyMap[item[unique]]){
				filterData.push(item);
				that._pageKeyMap[item[unique]] = true;
			}
		});
		return filterData;
	};

	/**
	 * 数据处理
	 * @param data
	 * @returns {*}
     * @private
     */
	proto._parseData = function(data){
		var that = this;
		//有分页信息的话，对分页数据进行处理：过滤，去重，统一返回并挂持在list字段上
		if(that.option.pageInfo){
			data.list = that._filter(data[that.option.pageInfo.listKey]);
			delete data[that.option.pageInfo.listKey];
			return data;
		}
	};

	/**
	 * 发送请求前的参数处理
	 * @param params
	 * @returns {*}
     */
	proto.parseParams = function(params){
		var that = this;
		var pageInfo = that.option.pageInfo;
		if(!pageInfo) return params;
		if(typeof params.start == "undefined"){
			params.start = pageInfo.index;
		}else{
			pageInfo.index = params.start;
		}
		if(typeof params.num == "undefined"){
			params.num = pageInfo.size;
		}
		return params;
	};

	/**
	 * 拉取远程服务器上的数据
	 * @param params
	 * @param callback
	 * @param update
	 * @param context	回调函数上下文对象
	 * @private
	 */
	proto.fetchFromServer = function(params, callback, update, context){
		var that = this;
		var option = that.option;
		var cacheKey = that._getCacheKey();
		var path = option.server.indexOf("http")==0? option.server: '/cgi-bin/'+option.server;
		if(that._cbs){
			that._cbs.push($.proxy(callback, context));
		}else{
			that._cbs = [$.proxy(callback, context)];
		}
		if(that.fetching) return;
		that.fetching = true;
		net.ajax({
			url: router.createUrl(path),
			data:{
				module: option.module,
				method: option.method,
				param: params
			},
			plugins : {
				'business/mergeRequest': true
			},
			cache: false,
			dataType: 'json',
			success: function(json) {
				that.fetching = false;
				if (json && ~$.inArray(json.result, option.acceptResults) && json.data) {
					that._serverData = json;
					//如果是第一次使用，或者与缓存不一致，再响应回调，并缓存cgi
					if( update || JSON.stringify( (cacheData.get( cacheKey) || {}).data ) != JSON.stringify( json.data ) ){
						//若为分页，则需先做过滤去重处理
						if(option.pageInfo){
							json.data = that._parseData(json.data);
						}

						//传出去的json为复制后的，以免回调中对数据的操作，影响后续json缓存
						that._batchCallback(json);

						//显示刷新回调日志
						setTimeout(function(){
							that._showRefreshLog();
						});
						//如果是非分页的接口
						if(!option.pageInfo){
							cacheData.set( cacheKey , json );
						}
					}
					//如果是分页的，则分页index自增
					if(option.pageInfo){
						params.start += option.pageInfo.size;
						option.pageInfo.index = params.start
					}
				}else{
					that._batchCallback({
						result: json.result,
						message: (json && json.message) || 'error data'
					});
				}
			},
			error: function(xhr, errorType, error) {
				that.fetching = false;
				that._batchCallback({
					result: -1,
					message: errorType
				});
			}
		});
	};

	/**
	 * 一并请求处理回调
	 */
	proto._batchCallback = function(json){
		var that = this;
		$.each(that._cbs, function(index, item){
			item($.extend(true, {}, json));
		});
		that._cbs = [];
	};

	/**
	 * 拼接缓存key
	 * 缓存key的组成部分为：模块名称+业务id+用户id?
	 * @returns {string}
	 * @private
	 */
	proto._getCacheKey = function(){
		var option = this.option;
		return [option.server, option.module, option.method, option.bid, router.getUserId()].join("_");
	};

	return Store;

});