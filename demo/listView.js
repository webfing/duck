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

list.next()		//��һҳ
list.prefetch()	//Ԥ��ȡ
list.update()	//�ص���ҳ������
list.destory()	//ģ������
list.getPage()	//��ǰ�ڼ�ҳ