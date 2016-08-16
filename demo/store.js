var bannerStore = Store.extend({
    server: '',
    module: '',
    method: ''
});

var banner = new bannerStore({
    page: 1,
    pageSize: 2
});

banner.prefetch();	//Ъ§ОндЄМгди