var list = new Pagenator({
    container: '',
    tpl: '',
    store: [banner, list],
    parse: function(){

    },
    event: {
        'beforefetch': function(){}
    },
    autoNext: true
})

list.next()		//下一页
list.prefetch()	//预拉取
list.update()	//回到首页并更新
list.destory()	//模块销毁
list.getPage()	//当前第几页