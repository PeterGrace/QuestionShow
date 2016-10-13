/**
 * * EventEmitter v3.1.4
 * * https://github.com/Wolfy87/EventEmitter
 * * 
 * * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * * Oliver Caldwell (olivercaldwell.co.uk)
 * */
(function(a){function c(a,b,c,d,e){this.type=a;this.listener=b;this.scope=c;this.once=d;this.instance=e}function b(){this._events={};this._maxListeners=10}"use strict";c.prototype.fire=function(a){this.listener.apply(this.scope||this.instance,a);if(this.once){this.instance.removeListener(this.type,this.listener,this.scope);return false}};b.prototype.eachListener=function(a,b){var c=null,d=null,e=null;if(this._events.hasOwnProperty(a)){d=this._events[a];for(c=0;c<d.length;c+=1){e=b.call(this,d[c],c);if(e===false){c-=1}else if(e===true){break}}}return this};b.prototype.addListener=function(a,b,d,e){if(!this._events.hasOwnProperty(a)){this._events[a]=[]}this._events[a].push(new c(a,b,d,e,this));this.emit("newListener",a,b,d,e);if(this._maxListeners&&!this._events[a].warned&&this._events[a].length>this._maxListeners){if(typeof console!=="undefined"){console.warn("Possible EventEmitter memory leak detected. "+this._events[a].length+" listeners added. Use emitter.setMaxListeners() to increase limit.")}this._events[a].warned=true}return this};b.prototype.on=b.prototype.addListener;b.prototype.once=function(a,b,c){return this.addListener(a,b,c,true)};b.prototype.removeListener=function(a,b,c){this.eachListener(a,function(d,e){if(d.listener===b&&(!c||d.scope===c)){this._events[a].splice(e,1)}});if(this._events[a]&&this._events[a].length===0){delete this._events[a]}return this};b.prototype.off=b.prototype.removeListener;b.prototype.removeAllListeners=function(a){if(a&&this._events.hasOwnProperty(a)){delete this._events[a]}else if(!a){this._events={}}return this};b.prototype.listeners=function(a){if(this._events.hasOwnProperty(a)){var b=[];this.eachListener(a,function(a){b.push(a.listener)});return b}return[]};b.prototype.emit=function(a){var b=[],c=null;for(c=1;c<arguments.length;c+=1){b.push(arguments[c])}this.eachListener(a,function(a){return a.fire(b)});return this};b.prototype.setMaxListeners=function(a){this._maxListeners=a;return this};if(typeof define==="function"&&define.amd){define(function(){return b})}else{a.EventEmitter=b}})(this)

StackExchange.realtime = (function() {
    var logToConsole;
    var connectRetries = 0;

    var socket;
    var channelBuffer = [];
    var ee = new EventEmitter();

    function init(endpoint, shouldLogToConsole) {
        logToConsole = shouldLogToConsole;

        if (socket) {
            try {
                logMessage('closing WebSocket');
                socket.close();
            } catch (ex) {
            }
        }

        if (!socket) {
            logMessage('opening WebSocket');

            if ('WebSocket' in window) {
                socket = new WebSocket(endpoint);
            } else {
                socket = new MozWebSocket(endpoint);
            }

            socket.onopen = function() {
                connectRetries = 0;
                logMessage('WebSocket opened');
                sendChannelBuffer();
                processHeartbeats();
            };

            socket.onmessage = function(msg) {
                var message = $.parseJSON(msg.data);
                ee.emit(message.action, message.data);
            };

            socket.onclose = function() {
                socket = null;
                logMessage('WebSocket closed');

                if (connectRetries < 5) {
                    connectRetries++;
                    logMessage('reconnect attempt: ' + connectRetries);
                    setTimeout(function() {
                        init(endpoint);
                    }, Math.random() * 5000);
                }
            };

            socket.onerror = function() {
                logMessage('WebSocket failed');
                socket = null;
            };
        }
    }

    function initPolling(getPollingUrl, pollingIntervalSeconds, callback) {
        logMessage('polling will begin in ' + pollingIntervalSeconds + ' seconds');

        setInterval(function() {
            var url = getPollingUrl();

            $.getJSON(url, function(questions) {
                var i;
                logMessage('received ' + questions.length + ' questions from ' + url);

                for (i = questions.length - 1; i >= 0; i--) {
                    callback(questions[i]);
                }
            });
        }, pollingIntervalSeconds * 1000);
    }

    function logMessage(message) {
        if (logToConsole) {
            console.log(message);
        }
    }

    function processHeartbeats() {
        ee.on('hb', function(data) {
            socket.send(data);
        });
    }

    function sendChannelBuffer() {
        if (socket == null || socket.readyState != 1) return;

        for (var i = 0, l = channelBuffer.length; i < l; i++) {
            logMessage("sending: " + channelBuffer[i]);
            socket.send(channelBuffer[i]);
        }
    }

    function subscribe(data) {
        channelBuffer.push(data);
        sendChannelBuffer();
    }

    function subscribeToRealtimeQuestions(socketEndpoint, socketSubscriptionName, getPollingUrl, pollingIntervalSeconds, shouldLogToConsole, callback) {
        if ('WebSocket' in window || 'MozWebSocket' in window) {
            if (!socket) init(socketEndpoint, shouldLogToConsole);

            subscribe(socketSubscriptionName);

            ee.on(socketSubscriptionName, function(data) {
                var question = $.parseJSON(data);
                callback(question);
            });
        } else {
            initPolling(getPollingUrl, pollingIntervalSeconds, callback);
        }
    }

    function subscribeToTopBarNotifications(endpoint, accountId, shouldLogToConsole) {
        if (!socket) init(endpoint, shouldLogToConsole);

        var subscriptionName = accountId + '-topbar';

        subscribe(subscriptionName);
        ee.on(subscriptionName, function(data) {
            StackExchange.topbar.handleRealtimeMessage(data);
        });
    }

    function subscribeForStatus(endpoint, subscriptionName, callback, shouldLogToConsole) {
        if ('WebSocket' in window || 'MozWebSocket' in window) {
            if (!socket) init(endpoint, shouldLogToConsole);

            subscribe(subscriptionName);

            ee.on(subscriptionName, function (data) {
                var question = $.parseJSON(data);
                callback(question);
            });
        }
    }

    function getRelativeTime(time) {
        var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var date = new Date(time * 1000);
        var delta = (((new Date()).getTime() - date.getTime()) / 1000);
        var val;

        if (delta < 2) {
            return 'just now';
        }
        if (delta < 60) {
            return Math.floor(delta) + ' secs ago';
        }
        if (delta < 120) {
            return '1 min ago';
        }
        if (delta < 3600) {
            return Math.floor(delta / 60) + ' mins ago';
        }
        if (delta < 7200) {
            return '1 hour ago';
        }
        if (delta < 86400) {
            return Math.floor(delta / 3600) + ' hours ago';
        }
        if (delta < 172800) {
            return 'yesterday';
        }
        if (delta < 259200) {
            return '2 days ago';
        }
        return monthNames[date.getUTCMonth()] + ' ' + date.getUTCDate() + ' \'' + (date.getUTCFullYear() % 1000) + ' at ' + date.getUTCHours() + ':' + date.getUTCMinutes();
    }

    return {
        init: init,
        subscribeForStatus: subscribeForStatus,
        getRelativeTime: getRelativeTime,
        subscribeToRealtimeQuestions: subscribeToRealtimeQuestions,
        subscribeToTopBarNotifications: subscribeToTopBarNotifications
    };
})();
