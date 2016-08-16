var ctl = new View({
    container: '',
    tpl: '',
    store: banner,
    parse: function(data){

    },
    event: {
        'li.item': function(){}
    }
})

ctl.load();		//模块开始加载
ctl.prefetch();	//模块数据预加载
ctl.update();	//模块数据更新
ctl.destory();	//模块销毁

ctl.getStore().next(num);
ctl.load();