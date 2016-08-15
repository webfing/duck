/**
 * 刷新html，对比直接的$.html的好处是到html真正变化才会做写入
 */

define(function(require,exports){
    var $           = require('lib/zepto');
    var cacheData 	= require('util/cacheData');
    var router 		= require('business/router');

    var pageId      = window.location.pathname;
    var OptDefault = {
        forceRefresh: false,        //是否强刷新
        htmlCache: false,           //是否开启html缓存
        bid: "bid"                  //业务id，用户区分相同模块不同业务html内容不同
    };

    var refreshHtml = $.fn.refreshHtml = function(html, option){
        var opt = $.extend(true, {}, OptDefault, option);
        var domUniqueId = _getDomUniqueId($(this));
        var cacheKey = ["htmlCache", pageId, opt.bid, router.getUserId(), domUniqueId].join("_");

        $(this).each(function(i, item){
            //如果强制刷新，或者从未写入过，则无需对比直接写入
            if(opt.forceRefresh || !$(item).data("__domWrited")){
                return _write(item);
            }

            //如果已经写入过了，再看与dom中的结构是否一致，不一致才有可能执行写入
            if(html!=$(item).html()){
                //开启html缓存
                var cacheHtml = cacheData.get(cacheKey);
                //没开启html缓存或开启了但缓存也不同则写入
                if(!opt.htmlCache || cacheHtml!=html){
                    _showRefreshLog(domUniqueId);
                    return _write(item);
                }
            }
        });

        function _write(dom){
            opt.htmlCache && _storeHtml(cacheKey, html);
            $(dom).html(html).data("__domWrited", true);
        }

        return $(this);
    };

    function _showRefreshLog(domUniqueId){
        console.log(new Array(30).join("-")+"htmlCache refresh:"+domUniqueId)
    };

    /**
     * 向上寻找，直到找到阻先有id属性的，才算唯一指向路径
     * @param $dom
     * @private
     */
    function _getDomUniqueId($dom){
        //当前元素本身有id属性，则直接返回
        if($dom[0].id) return _getNodeName($dom[0]);
        var parents = $dom.parents("*");
        var paths = [_getNodeName($dom[0])];
        $.each(parents, function(i, item){
            paths.push(_getNodeName(item));
            //已定位到id
            if(item.id){
                return false;
            }
        });
        return paths.join("_");
    }

    /**
     * 获取节点名称
     * @private
     */
    function _getNodeName(node){
        if(node.id) return "#"+node.id;
        if(node.ClassName) return "."+node.ClassName;
        return node.tagName;
    }

    function _storeHtml (key, value){
        setTimeout(function(){
            cacheData.set(key, value);
        });
    }

});
