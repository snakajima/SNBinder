/*!
 * SNBinder JavaScript Library v0.5.3
 *
 * Copyright (c) 2009 Satoshi Nakajima (Twitter: @snakajima, Blog:http://satoshi.blogs.com/uie)
 * Licensed under the MIT license + "keep this comment block even if you modify it".
 *
 * History:
 *  02-12-2010 Created for the project "Entertain LA" (http://entertainla.com)
 *  01-20-2011 Published as snbinder-0.5.3.js
 */
var SNBinder = (function() {
    var cache = {};
    var handlers = {
        isDebug: function() {
            return /localhost:8/.test(window.location.href);
        },
        error: function(verb, url) {
            alert("The server is not accessible ("+verb+"):" + url);
        },
        debug: {
            delay: 200
        },
        login: function() {
            alert("must be implemented by the application");
        }
    };
    return {
        isDebug: function() {
            return handlers.isDebug();
        },
        init: function(_handlers) {
            $.extend(handlers, _handlers);
        },
        flush_all: function() {
            cache = {};
        },
        cache: function(url) {
            return cache[url];
        },
        flush: function(url, params) {
            url = params ? (url + "?" + jQuery.param(params)) : url;
            cache[url] = null;
        },
        get_sections: function(url, params, callback, _options) {
            SNBinder.get(url, params, false, function(data) {
                callback(data.split('{%}'));
            }, _options);
        },
        get_named_sections: function(url, params, callback, _options) {
            SNBinder.get(url, params, false, function(data) {
                var sections = data.split('{%}').slice(1);
                var count = sections.length;
                var dict = {};
                for (var i=0; i<count; i++) {
                    dict[sections[i*2]] = sections[i*2+1];
                }
                callback(dict);
            }, _options);
        },
        get: function(url, params, isJson, callback, _options) {
            var options  = {
                bypass_cache: false,
                cache_result: true
            };
            $.extend(options, _options); 
        
            var url = params ? (url + "?" + jQuery.param(params)) : url;
            if (options.bypass_cache) {
                cache[url] = null;
            }
            if (cache[url]) {
                var data = cache[url];
                if (isJson) {
                   var json = SNBinder.evaluate(data);
                   callback(json, data);
                } else {
                   callback(data);
                }
            } else {
                (function() {
                    var retry = 0;
                    var _attempt = function() {
                        if (handlers.debug.delay > 0 && handlers.isDebug()) {
                            if (retry === 0) {
                                retry++;
                                window.setTimeout(_attempt, handlers.debug.delay);
                                return;
                            }
                        }

                        $.ajax({
                            type: "GET",
                            url: url,
                            success: function(data) {
                                var json = null;
                                if (isJson) {
                                   json = SNBinder.evaluate(data);
                                   if (json.login_required) {
                                      return handlers.login(json);
                                   }
                                }
                                if (options.cache_result) {
                                    cache[url] = data;
                                }
                                if (isJson) {
                                   callback(json, data);
                                } else {
                                   callback(data);
                                }
                            },
                            error: function () {
                                if (retry < 3) {
                                    retry++;
                                    _attempt();
                                } else {
                                    handlers.error("get", url);
                                }
                            }
                        });
                    };
                    _attempt();
                })();
                //$.get(url, null, function(data, textStatus) {
                //    cache[url] = data;
                //    callback(cache[url]);
                //});
            }
        },
        post: function(url, params, isJson, callback) {
            (function() {
                var retry = 0;
                var _attempt = function() {
                    if (handlers.debug.delay > 0 && handlers.isDebug()) {
                        if (retry === 0) {
                            retry++;
                            window.setTimeout(_attempt, handlers.debug.delay);
                            return;
                        }
                    }
                
                    $.ajax({
                        type: "POST",
                        url: url,
                        data: jQuery.param(params ? params : {}),
                        success: function(data) {
                            var json = null;
                            if (isJson) {
                                json = SNBinder.evaluate(data);
                                if (json.login_required) {
                                    return handlers.login(json);
                                }
                            }
                            if (isJson) {
                                callback(json, data);
                            } else {
                                callback(data);
                            }
                        },
                        error: function () {
                            if (retry<3) {
                                retry++;
                                _attempt();
                            } else {
                                handlers.error("post", url);
                            }
                        }
                    });
                };
                _attempt();
            })();
        }, // end of post
        evaluate: function(json) {
            if (typeof(json) == 'object') {
                return json;
            }            
            try {
                var obj;
                eval("obj=" + json);
                return obj;
            } catch(err) {
                alert(err + ":" + json);
            }
            return {};
        },
        escape: function(text) { 
            return text.replace(/&/g, '&amp;')
                       .replace(/'/g, '&#146;') //'
                       .replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;')
                       .replace(/\n/g, '<br />');
        },
        compile: function(htm) {
            var _templatize = function(htm) {
                return '"' + htm.replace(/\"/g, "'")
                                .replace(/[\r\n]/g, " ")
                                .replace(/\$\(index\)/g, '"+index+"')
                                .replace(/\$\(\.([a-z0-9_\.]*)\)/gi, '"+SNBinder.escape(""+row.$1)+"')
                                .replace(/\$\(\_([a-z0-9_\.]*)\)/gi, '"+row.$1+"')
                                +'"';
            }; // "
            var _func;
            eval("_func = function(row, index) { return (" + _templatize(htm) + "); };");
            return _func;
        },
        bind: function(htm, data, index) {
            var _func = SNBinder.compile(htm);
            return _func(data, index);
        },
        bind_rowset: function(htm, rowset) {
            var rows = [];
            var _func = SNBinder.compile(htm);
            for (index in rowset) {
                rows.push(_func(rowset[index], index));
            }
            return rows.join('');
        },
        __trailing__: null  // so that I won't forget to remove trailing comma for IE
    }; // end of return
})(); // end of SNBinder = function()

