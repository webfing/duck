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

view.load();		//ģ�鿪ʼ����
view.prefetch();	//ģ������Ԥ����
view.update();	//ģ�����ݸ���
view.destory();	//ģ������

view.getStore().next(num);
view.load();