var page = PageView({
    title: '',
    transpanBar: true,
    dragRightArea: function(){},
    share: {
        title: '',
        content: '游戏中心视频，欢迎',
        icon: ''
    },
    share: function(){
        gameinfo.fetch().then(function(){
            page.setShare()
        })
    },
    pvReport: {

    },
    speedReport: {

    },
    item: [[abc, def, abc], [adf, afd]],
    event: {
        'onshow': function(){
            page.refresh(module);
        },
        'onhide': function(){},
        'onback': function(){
            page.toTop();
            page.releaseOnBack();
        },
        'unlogin': function(){
            page.showLoginForm()
        }
    }
});

page.params;
page.modules;
page.destory();


page.load();








