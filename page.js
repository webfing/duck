
/**
 * 页面对象，封装了页面的一些常用操作
 * 设置分享，刷新页面标题，锁住滚动，回顶部
 * by kingpjchen 20160114
 */
define(function factory(require, exports, module) {

    var gameShare = require("business/gameShare"),
        common        = require('jsBridge/common'),
        router = require('business/router'),
        string = require("util/string");

    var page = {};

    /**
     * 设置页面分享
     * @param option
     */
    page.setShare = function(option){
        var defaultOption = {
            title: "游戏中心",
            desc: "游戏中心，最大最全的手游平台",
            icon: "http://gamecenter.qq.com/front/release/img/game2.png",
            url: window.location.pathname,
            params: {}
        };
        var opt = $.extend(true, {}, defaultOption, option);
        var param = {
            title: opt.title,
            desc: opt.desc,
            imageUrl: opt.icon,
            shareUrl: router.createUrlStruct(opt.url, opt.params)
        };
        setTimeout(function(){
            gameShare.init(param);
            gameShare.addActionButton();
        }, 1000);
    };

    /**
     * 重新设置分享的参数
     * 使用场景：如果页面是tab型的，并且需要切换到不同tag再分享时默认进入当前tab
     * @param key
     * @param value
     */
    page.setShareParam = function(key, value){
        router.setShareUrlParam(key, value)
    };

    /**
     * 刷新页面标题
     * @param title
     */
    page.refreshTitle = function(title){
        title = title || "游戏中心";
        $('title').text(string.decodeHTML(title));
        setTimeout(function(){
            common._invokeByCommonAPI('mqq.ui.refreshTitle', []);
        },0);
    };

    /**
     * 锁住页面，不可滚动
     */
    page.lockScroll = function(){
        $("body").bind("touchmove.lockScroll", function(e){
            return false;
        }).css({
            "height": $(window).height,
            "overflow": "hidden"
        });
    };

    /**
     * 解锁滚动
     */
    page.releaseScroll = function(){
        $("body").unbind("touchmove.lockScroll").css({
            "height": "auto",
            "overflow": "auto"
        });
    };

    /**
     * 显示页面loading
     */
    page.showLoading = function(){
        $(".wrapper").hide();
        $("#loading-wrap").show();
    };

    /**
     * 隐藏页面loading
     */
    page.hideLoading = function(){
        $(".wrapper").show();
        $("#loading-wrap").hide();
    };

    /**
     * 滚动到页面顶部
     */
    page.scrollTop = function(){
        $("body").scrollTop(0);
    };

    return page;

});