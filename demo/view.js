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

ctl.load();		//ģ�鿪ʼ����
ctl.prefetch();	//ģ������Ԥ����
ctl.update();	//ģ�����ݸ���
ctl.destory();	//ģ������

ctl.getStore().next(num);
ctl.load();