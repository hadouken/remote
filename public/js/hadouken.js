// The Hadouken JS API

(function (window, $) {

    var TORRENT_STATUS = {
        Checking: 1,
        Downloading: 3,
        Seeding: 5
    };

    function Config() {
    }

    Config.prototype.get = function(key, defaultValue) {
        var container = this._getContainer();
        return container.config[key] || defaultValue;
    };

    Config.prototype.set = function(key, value) {
        var container = this._getContainer();
        container.config[key] = value;
        this._setContainer(container);
    };

    Config.prototype._getContainer = function() {
        var container = localStorage.getItem("hadouken-remote");

        if (!container) {
            return { config: { } };
        }

        return JSON.parse(container);
    };

    Config.prototype._setContainer = function(container) {
        localStorage.setItem("hadouken-remote", JSON.stringify(container));
    };

    function Connection(url, authHeader) {
        this.url = url;
        this.authHeader = authHeader;
    }

    Connection.prototype.rpc = function(cfg) {
        var rpc = {
            jsonrpc: "2.0",
            id: 1,
            method: cfg.method,
            params: cfg.params
        };

        $.ajax({
            type: "POST",
            url: this.url,
            headers: {
                "Authorization": this.authHeader
            },
            data: JSON.stringify(rpc),
            success: function (data) {
                if(cfg.success) {
                    cfg.success(data.result);
                }
            },
            error: function (xhr, status, error) {
                if(cfg.error) {
                    cfg.error(xhr, status, error);
                }
            }
        });
    };

    function Utils() {
    }

    Utils.prototype.connectionLost = function() {
        if(this.hasShownConnectionLost) {
            return;
        }

        this.hasShownConnectionLost = true;

        $.get("connection_lost.html", function (d) {
            $(d).modal({
                backdrop: "static",
                keyboard: false
            });
        });
    }

    Utils.prototype.toFileSize = function(bytes, precision) {
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes) || bytes <= 0) return '-';
        if (typeof precision === 'undefined') precision = 1;
        var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
            number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
    };

    Utils.prototype.toSpeed =  function (bytes, precision) {
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes) || bytes <= 1024) return '-';
        if (typeof precision === 'undefined') precision = 1;
        var units = ['B/s', 'KiB/s', 'MiB/s', 'GiB/s', 'TiB/s', 'PiB/s'],
            number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
    };

    Utils.prototype.toStatusString = function(torrent) {
        if(torrent.isPaused) {
            return "Paused";
        }
        
        switch(torrent.state) {
            case TORRENT_STATUS.Checking:
                return "Checking files";
            case TORRENT_STATUS.Downloading:
                return "Downloading";
            case TORRENT_STATUS.Seeding:
                return "Seeding";
        }

        console.log(torrent.state);
    };

    window.Hadouken = {
        Config: Config,
        Connection: Connection,

        utils: new Utils(),
        
        loadPage: function (url, container, callback) {
            callback = callback || Function.from();

            $.get(url, function (html) {
                $(container).html(html);
                callback();
            });
        }
    };

})(window, window.jQuery);
