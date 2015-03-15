(function($, Hadouken) {
    Hadouken.Views = Hadouken.Views || {};

    var cfg = new Hadouken.Config();

    function TorrentsView() {
        this.timer = null;
        this.torrents = {};
    }

    TorrentsView.prototype.load = function() {
        Hadouken.loadPage("torrents.html", "#content", function () {
            var remoteUrl = cfg.get("http.remote.url");
            var authType = cfg.get("http.remote.auth.type");

            if(!remoteUrl) {
                $("#noRemote").removeClass("hidden");
                $("#showAddTorrent").attr("disabled", true);
                return;
            }

            if(authType === "basic") {
                var user = cfg.get("http.remote.auth.basic.userName");
                var pass = cfg.get("http.remote.auth.basic.password");
                this.connection = new Hadouken.Connection(remoteUrl, "Basic " + btoa(user + ":" + pass));
            } else if(authType === "token") {
                var token = cfg.get("http.remote.auth.token");
                this.connection = new Hadouken.Connection(remoteUrl, "Token " + token);
            } else {
                this.connection = new Hadouken.Connection(remoteUrl, "");
            }

            $("#showAddTorrent").click(function(e) {
                e.preventDefault();
                this.showAddTorrents();
            }.bind(this));

            this.fetch();
            this.timer = setInterval(this.fetch.bind(this), 1000);
        }.bind(this));
    };

    TorrentsView.prototype.unload = function() {
        clearInterval(this.timer);
    }

    TorrentsView.prototype.showAddTorrents = function() {
        $.get("torrents_add.html", function(html) {
            var dialog = $(html).modal();

            dialog.on("show.bs.modal", function() {
                dialog.find("#torrentFile").change(function() {
                    dialog.find("#addTorrent").attr("disabled", dialog.find("#torrentFile")[0].files.length === 0);
                }).change();

                dialog.find("#addTorrent").click(function() {
                    var files = dialog.find("#torrentFile")[0].files;

                    for(var i = 0, f; f = files[i]; i++) {
                        var reader = new FileReader();

                        reader.onload = (function(file) {
                            return function(e) {
                                this.addFile(e.target.result.split(",")[1], dialog);
                            }.bind(this);
                        }.bind(this))(f);

                        reader.readAsDataURL(f);
                    }
                }.bind(this));
            }.bind(this));

            dialog.modal("show");
        }.bind(this));
    };

    TorrentsView.prototype.addFile = function(data, dialog) {
        this.connection.rpc({
            method: "session.addTorrentFile",
            params: [ data, { } ],
            success: function (r) {
                dialog.modal("hide");
            }
        });
    };

    TorrentsView.prototype.fetch = function() {
        this.connection.rpc({
            method: "session.getTorrents",
            params: [],
            success: function (d) {
                if (Object.keys(d).length > 0) {
                    $(".nothing-to-see-here").hide();
                } else {
                    $(".nothing-to-see-here").show();
                }
                
                // Loop through the result.
                // if the key exists locally, update
                // if the key does not exist, add
                // if we have key which is not in the result, remove

                for(var key in d) {
                    if(this.torrents[key]) {
                        this.torrents[key] = d[key];
                        this.updateTorrent(this.torrents[key]);
                    } else {
                        this.torrents[key] = d[key];
                        this.addTorrent(this.torrents[key]);
                    }
                }

                for(var localKey in this.torrents) {
                    if(!d[localKey]) {
                        delete this.torrents[localKey];
                        this.removeTorrent(localKey);
                    }
                }

            }.bind(this),
            error: function (xhr, status, error) {
                if (status === "error" && !error) {
                    // Unspecified error...
                    Hadouken.utils.connectionLost();
                    clearInterval(this.timer);
                }
            }.bind(this)
        });
    };

    TorrentsView.prototype.updateTorrent = function(torrent) {
        var row = $("#torrentsList > tr[data-torrent-id='" + torrent.infoHash + "']");

        row.find(".torrentName").text(torrent.name).attr("href", "#/torrents/" + torrent.infoHash);
        row.find(".savePath").text(torrent.savePath);
        row.find(".torrentSize").text(Hadouken.utils.toFileSize(torrent.totalSize));
        row.find(".torrentState").text(Hadouken.utils.toStatusString(torrent));
        row.find(".downloadSpeed").text(Hadouken.utils.toSpeed(torrent.downloadRate));
        row.find(".uploadSpeed").text(Hadouken.utils.toSpeed(torrent.uploadRate));

        row.find(".progress-bar")
            .css({ width: (torrent.progress * 100 | 0) + '%'})
            .text((torrent.progress * 100 | 0) + '%');
    };

    TorrentsView.prototype.addTorrent = function(torrent) {
        var tmpl = $($("#torrentItemTemplate").html());
        tmpl.attr("data-torrent-id", torrent.infoHash);
        $("#torrentsList").append(tmpl);

        this.updateTorrent(torrent);
    };

    TorrentsView.prototype.removeTorrent = function(infoHash) {
        console.log("Removing torrent");
    };

    Hadouken.Views.TorrentsView = TorrentsView;

})(window.jQuery, window.Hadouken);