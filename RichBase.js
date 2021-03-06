/**
 * Base
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {

    var Base = require('./Base')

    return Base.extend({
        __config: {
            container: '',
            tpl: ''
        },
        EVENTS:{},
        init:function(config){
            //存储配置项
            this.setUpConfig(config);
            //解析代理事件
            this._delegateEvent()
            this.setUp()
        },
        //循环遍历EVENTS，使用jQuery的delegate代理到container
        _delegateEvent:function(){
            var self = this
            var events = this.EVENTS || {}
            var eventObjs,fn,select,type
            var container = this.get('container') || $(document.body)

            for (select in events) {
                eventObjs = events[select]

                for (type in eventObjs) {
                    fn = eventObjs[type]

                    container.delegate(select,type,function(e){
                        fn.call(null,self,e)
                    })
                }

            }

        },
        //支持underscore的极简模板语法
        //用来渲染模板，这边是抄的underscore的。非常简单的模板引擎，支持原生的js语法
        _parseTemplate:function(str,data){
            /**
             * http://ejohn.org/blog/javascript-micro-templating/
             * https://github.com/jashkenas/underscore/blob/0.1.0/underscore.js#L399
             */
            var fn = new Function('obj',
                'var p=[],print=function(){p.push.apply(p,arguments);};' +
                'with(obj){p.push(\'' + str
                    .replace(/[\r\t\n]/g, " ")
                    .split("<%").join("\t")
                    .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                    .replace(/\t=(.*?)%>/g, "',$1,'")
                    .split("\t").join("');")
                    .split("%>").join("p.push('")
                    .split("\r").join("\\'") +
                "');}return p.join('');")
            return data ? fn(data) : fn
        },
        //提供给子类覆盖实现
        setUp:function(){
            this.render()
        },
        //用来实现刷新，只需要传入之前render时的数据里的key还有更新值，就可以自动刷新模板
        setChuckdata:function(key,value){
            var self = this
            var data = self.get('__renderData')
            var tpl = self.get('tpl')

            //更新对应的值
            data[key] = value

            if (!tpl) return;
            //重新渲染
            var newHtmlNode = $(self._parseTemplate(tpl,data))
            //拿到存储的渲染后的节点
            var currentNode = self.get('__currentNode')
            if (!currentNode) return;
            //替换内容
            currentNode.replaceWith(newHtmlNode)

            self.set('__currentNode',newHtmlNode)

        },
        //使用data来渲染模板并且append到container下面
        render:function(data){
            var self = this
            var tpl = self.get('tpl')
            var template
            //先存储起来渲染的data,方便后面setChuckdata获取使用
            self.set('__renderData',data)

            if (!tpl) return;

            if(Object.prototype.toString.call(tpl) == '[object Function]'){
                template = tpl
            }else if(Object.prototype.toString.call(tpl) == '[object String]'){
                template = self._parseTemplate(tpl)
            }else if(typeof tpl == 'object'){
                template = tpl.html()
            }

            //使用_parseTemplate解析渲染模板生成html
            //子类可以覆盖这个方法使用其他的模板引擎解析
            var html = template(data)

            var container = this.get('container') || $(document.body)

            var currentNode = $(html)
            //保存下来留待后面的区域刷新
            //存储起来，方便后面setChuckdata获取使用
            self.set('__currentNode',currentNode)
            container.append(currentNode)
        },
        destroy:function(){

            var self = this
            //去掉自身的事件监听
            self.off()
            //删除渲染好的dom节点
            self.get('__currentNode').remove()
            //去掉绑定的代理事件
            var events = self.EVENTS || {}
            var eventObjs,fn,select,type
            var container = self.get('container')

            for (select in events) {
                eventObjs = events[select]

                for (type in eventObjs) {
                    fn = eventObjs[type]

                    container.undelegate(select,type,fn)
                }

            }

        }
    })

})

