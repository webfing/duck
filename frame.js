/**
 * 框架入口
 */
;(function(window){
    //chunked数据暂存
    window._moduleDataMap = {}; //用来存模块的数据
    window._pageModule = {};    //用来存页面的模块
    window._renderModule = function(info) {
        if(!info) return;
        /**
         * 如果在chunk数据回来时，模块已经进位了，就直接通过renderByData方法渲染模块
         * 否则，先把chunk数据存起来，等到模块就位时再使用该chunk数据
         */
        if(window._pageModule[info.controller]){
            window._pageModule[info.controller].renderByData(info.data);
        }else{
            window._moduleDataMap[info.controller] = info.data;
        }
    }

})(this);