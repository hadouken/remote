// The Hadouken JS API

(function (window, $) {

    var TORRENT_STATUS = {
        Queued: 0,
        Checking: 1,
        DownloadingMetadata: 2,
        Downloading: 3,
        Finished: 4,
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

    Connection.get = function() {
        var cfg = new Config();

        var remoteUrl = cfg.get("http.remote.url");
        var authType = cfg.get("http.remote.auth.type");

        if(authType === "basic") {
            var user = cfg.get("http.remote.auth.basic.userName");
            var pass = cfg.get("http.remote.auth.basic.password");
            return new Connection(remoteUrl, "Basic " + btoa(user + ":" + pass));
        } else if(authType === "token") {
            var token = cfg.get("http.remote.auth.token");
            return new Connection(remoteUrl, "Token " + token);
        } else {
            return new Connection(remoteUrl, "");
        }
    };

    Connection.prototype.rpc = function(cfg) {
        var rpc = {
            jsonrpc: "2.0",
            id: 1,
            method: cfg.method,
            params: cfg.params
        };

        var headers = {
            "Content-Type": "application/json"
        };

        if(this.authHeader !== "") {
            headers["Authorization"] = this.authHeader;
        }

        $.ajax({
            type: "POST",
            url: this.url,
            headers: headers,
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

    Utils.prototype.connectionLost = function(xhr, status, error) {
        console.log(arguments);
        $.get("connection_lost.html", function (d) {
            $(d).modal({
                backdrop: "static",
                keyboard: false,
                show: false
            }).on("show.bs.modal", function() {
                var m = $(this);

                var errorText = xhr.status + " - " + error + ".";

                if(xhr.status === 0 && error === "") {
                    errorText = "Connection refused.";
                }

                m.find(".errorText").text(errorText);
                m.find(".btn-configure").on("click", function(e) {
                    e.preventDefault();
                    m.modal('hide');
                    location.href = $(this).attr("href");
                });
            }).modal('show');
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
        if(torrent.error) {
            return "Error";
        }
        
        if(torrent.isPaused) {
            return "Paused";
        }

        switch(torrent.state) {
            case TORRENT_STATUS.Queued:
                return "Queued";
            case TORRENT_STATUS.Checking:
                return "Checking files";
            case TORRENT_STATUS.DownloadingMetadata:
                return "Downloading metadata";
            case TORRENT_STATUS.Downloading:
                return "Downloading";
            case TORRENT_STATUS.Finished:
                return "Finished";
            case TORRENT_STATUS.Seeding:
                return "Seeding";
        }

        return "Unknown state: " + torrent.state;
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
