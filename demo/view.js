var view = new View({
    container: '',
    tpl: '',
    store: banner,
    iOSCheck: true,
    parse: function(data){

    },
    event: {
        'li.item': function(){}
    }
});

view.load();		//模块开始加载
view.prefetch();	//模块数据预加载
view.update();	//模块数据更新
view.destory();	//模块销毁

view.getStore().next(num);
view.load();