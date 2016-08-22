/**
 * tools
 * by kingpjchen 20160813
 */
define(function factory(require, exports, module) {
    var mix = function(r, s) {
        for (var p in s) {
            if (s.hasOwnProperty(p)) {
                r[p] = s[p]
            }
        }
        return r;
    }

    var namespace = function(context, ns) {
        if(!context) return context;
        var nodes = ns.split('.');
        var node
        while((node = nodes.shift()) && context) {
            context = context[node]
        }
        return context;
    }

    return {
        mix: mix,
        namespace: namespace
    }
})

