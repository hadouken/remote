(function($, Hadouken) {
    Hadouken.Views = Hadouken.Views || {};

    function TorrentsView() {
        this.cfg = new Hadouken.Config();
        this.timer = null;
        this.torrents = {};
    }

    TorrentsView.prototype.load = function() {
        Hadouken.loadPage("torrents.html", "#content", function () {
            var remoteUrl = this.cfg.get("http.remote.url");
            var authType = this.cfg.get("http.remote.auth.type");

            if(!remoteUrl) {
                $("#configure-intro").removeClass("hidden");
                $("#noRemote").removeClass("hidden");
                $("#showAddTorrent").attr("disabled", true);
                return;
            }

            if(authType === "basic") {
                var user = this.cfg.get("http.remote.auth.basic.userName");
                var pass = this.cfg.get("http.remote.auth.basic.password");
                this.connection = new Hadouken.Connection(remoteUrl, "Basic " + btoa(user + ":" + pass));
            } else if(authType === "token") {
                var token = this.cfg.get("http.remote.auth.token");
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
                var sourceType = "file";

                dialog.find("#torrentFile").change(function() {
                    toggleAddTorrent("file");
                }).change();

                dialog.find("#torrentUrl").keyup(function() {
                    toggleAddTorrent("url");
                });

                function toggleAddTorrent(type) {
                    if(type === "file") {
                        dialog.find("#addTorrent").attr("disabled", dialog.find("#torrentFile")[0].files.length === 0);
                    } else {
                        dialog.find("#addTorrent").attr("disabled", dialog.find("#torrentUrl").val().length === 0);
                    }
                }

                function sourceChanged(type) {
                    if(type === "file") {
                        dialog.find("#sourceFile").show();
                        dialog.find("#sourceUrl").hide();
                    } else {
                        dialog.find("#sourceFile").hide();
                        dialog.find("#sourceUrl").show();
                    }

                    toggleAddTorrent(type);
                    sourceType = type;
                }

                dialog.find("input:radio[name='sourceType']").change(function() {
                    sourceChanged($(this).val());
                });

                sourceChanged("file");

                dialog.find("#addTorrent").click(function() {
                    if(sourceType === "file") {
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
                    } else {
                        this.addUrl(dialog.find("#torrentUrl").val(), dialog);
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

    TorrentsView.prototype.addUrl = function(url, dialog) {
        this.connection.rpc({
            method: "session.addTorrentUri",
            params: [ url, { } ],
            success: function() {
                dialog.modal("hide");
            }
        });
    }

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
                        this.updateTorrentRow(this.torrents[key]);
                    } else {
                        this.torrents[key] = d[key];
                        this.addTorrentRow(this.torrents[key]);
                    }
                }

                for(var localKey in this.torrents) {
                    if(!d[localKey]) {
                        delete this.torrents[localKey];
                        this.removeTorrentRow(localKey);
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

    TorrentsView.prototype.updateTorrentRow = function(torrent) {
        var row = $("#torrentsList > tr[data-torrent-id='" + torrent.infoHash + "']");

        var queuePos = "";
        if (torrent.queuePosition >= 0) {
            queuePos = torrent.queuePosition;
        }

        if(torrent.isPaused) {
            row.find(".resumeTorrent").show();
            row.find(".pauseTorrent").hide();
        } else {
            row.find(".resumeTorrent").hide();
            row.find(".pauseTorrent").show();
        }

        row.find(".queuePosition").text(queuePos);
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

    TorrentsView.prototype.addTorrentRow = function(torrent) {
        var me = this;
        var tmpl = $($("#torrentItemTemplate").html());
        
        tmpl.attr("data-torrent-id", torrent.infoHash);
        
        (function(infoHash) {
            tmpl.find(".moveTorrent").click(function(e) {
                e.preventDefault();
                me.showMoveTorrent(infoHash);
            });

            tmpl.find(".removeTorrent").click(function(e) {
                e.preventDefault();
                me.showRemoveTorrent(infoHash);
            });

            tmpl.find(".pauseTorrent").click(function(e) {
                e.preventDefault();
                me.pauseTorrent(infoHash);
            });

            tmpl.find(".resumeTorrent").click(function(e) {
                e.preventDefault();
                me.resumeTorrent(infoHash);
            });
        })(torrent.infoHash);

        $("#torrentsList").append(tmpl);

        this.updateTorrentRow(torrent);
    };

    TorrentsView.prototype.removeTorrentRow = function(infoHash) {
        var row = $("#torrentsList > tr[data-torrent-id='" + infoHash + "']");
        row.remove();
    };

    TorrentsView.prototype.showMoveTorrent = function(infoHash) {
        var me = this;

        var torrent = this.torrents[infoHash];
        if(!torrent) { console.error("Torrent not found: " + infoHash); }

        $.get("torrent_move.html", function(html) {
            var dialog = $(html).modal();

            dialog.on("show.bs.modal", function() {
                dialog.find(".torrentName").text(torrent.name);
                dialog.find(".torrentCurrentPath").text(torrent.savePath);
                dialog.find(".torrentDestinationPath").val(torrent.savePath);

                dialog.find("#moveTorrent").click(function(e) {
                    e.preventDefault();
                    var destination = dialog.find(".torrentDestinationPath").val();

                    me.moveTorrent(infoHash, destination, function() {
                        dialog.modal("hide");
                    });
                });
            });

            dialog.modal("show");
        });
    };

    TorrentsView.prototype.showRemoveTorrent = function(infoHash) {
        var me = this;

        var torrent = this.torrents[infoHash];
        if(!torrent) { console.error("Torrent not found: " + infoHash); }

        $.get("torrent_remove.html", function(html) {
            var dialog = $(html).modal();

            dialog.on("show.bs.modal", function() {
                dialog.find(".torrentName").text(torrent.name);
                dialog.find("#removeTorrent").click(function(e) {
                    e.preventDefault();
                    var removeData = dialog.find(".removeData").is(":checked");

                    me.removeTorrent(infoHash, removeData, function() {
                        dialog.modal("hide");
                    });
                });
            });

            dialog.modal("show");
        });
    };

    TorrentsView.prototype.pauseTorrent = function(infoHash) {
        this.connection.rpc({
            method: "torrent.pause",
            params: [ infoHash ]
        });
    };

    TorrentsView.prototype.resumeTorrent = function(infoHash) {
        this.connection.rpc({
            method: "torrent.resume",
            params: [ infoHash ]
        });
    };

    TorrentsView.prototype.moveTorrent = function(infoHash, destinationPath, callback) {
        this.connection.rpc({
            method: "torrent.moveStorage",
            params: [ infoHash, destinationPath ],
            success: function() {
                if(callback) {
                    callback();
                }
            }
        });
    };

    TorrentsView.prototype.removeTorrent = function(infoHash, removeData, callback) {
        this.connection.rpc({
            method: "session.removeTorrent",
            params: [ infoHash, removeData ],
            success: function() {
                if(callback) {
                    callback();
                }
            }
        });
    };

    Hadouken.Views.TorrentsView = TorrentsView;

})(window.jQuery, window.Hadouken);