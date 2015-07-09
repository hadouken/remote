(function($, Hadouken) {
    Hadouken.Views = Hadouken.Views || {};

    var cfg = new Hadouken.Config();

    function TorrentDetailsView(infoHash) {
        this.connection = Hadouken.Connection.get();
        this.timer = null;
        this.timerTarget = "general";
        this.infoHash = infoHash;

        this.files = {};
        this.peers = {};
        this.trackers = {};
    }

    TorrentDetailsView.prototype.load = function() {
        this.update_general(function(torrent) {
            Hadouken.loadPage("torrent_details.html", "#content", function () {
                $(".torrentName").text(torrent.name);

                if(torrent.error) {
                    $(".torrentErrorText").text(torrent.error);
                } else {
                    $("#torrentError").hide();
                }

                var that = this;

                $("#torrentError").on("closed.bs.alert", function() {
                    that.connection.rpc({
                        method: "torrent.clearError",
                        params: [torrent.infoHash],
                        success: function() {}
                    });
                });

                // Hook up tab view
                $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                    that.timerTarget = $(e.target).attr("aria-controls");
                    clearInterval(that.timer);
                    that.update();
                    that.timer = setInterval(that.update.bind(that), 1000);
                });

                this.update();
                this.timer = setInterval(this.update.bind(this), 1000);
            }.bind(this));
        }.bind(this));
    };

    TorrentDetailsView.prototype.unload = function() {
        clearInterval(this.timer);
    };

    TorrentDetailsView.prototype.update = function() {
        var target = "update_" + this.timerTarget;
        this[target]();
    };

    TorrentDetailsView.prototype.update_general = function(callback) {
        callback = callback || function() {};

        this.connection.rpc({
            method: "session.getTorrents",
            params: [ this.infoHash ],
            success: function(d) {
                var torrent = d[this.infoHash];
                callback(torrent);

                $(".torrentSavePath").text(torrent.savePath);
            }.bind(this),
            error: function(xhr, status, error) {
                Hadouken.utils.connectionLost(xhr, status, error);
                this.unload();
            }.bind(this)
        });
    };

    TorrentDetailsView.prototype.update_files = function() {
        this.connection.rpc({
            method: "torrent.getFiles",
            params: [ this.infoHash ],
            success: function(files) {
                for(var i = 0; i < files.length; i++) {
                    var key = "file_" + i;

                    if(this.files[key]) {
                        this.files[key] = files[i];
                        this.updateFileRow(this.files[key]);
                    } else {
                        this.files[key] = files[i];
                        this.addFileRow(this.files[key]);
                    }
                }
            }.bind(this),
            error: function(xhr, status, error) {
                Hadouken.utils.connectionLost(xhr, status, error);
                this.unload();
            }.bind(this)
        });
    };

    TorrentDetailsView.prototype.update_peers = function() {
        this.connection.rpc({
            method: "torrent.getPeers",
            params: [ this.infoHash ],
            success: function(peers) {
                var map = peers.reduce(function(o, v, i) {
                    o[v.ip + ":" + v.port] = v;
                    return o;
                }, {});

                for(var key in map) {
                    if(this.peers[key]) {
                        this.peers[key] = map[key];
                        this.updatePeerRow(this.peers[key]);
                    } else {
                        this.peers[key] = map[key];
                        this.addPeerRow(this.peers[key]);
                    }
                }

                for(var localKey in this.peers) {
                    if(!map[localKey]) {
                        delete this.peers[localKey];
                        this.removePeerRow(localKey);
                    }
                }
            }.bind(this),
            error: function(xhr, status, error) {
                Hadouken.utils.connectionLost(xhr, status, error);
                this.unload();
            }.bind(this)
        });
    };

    TorrentDetailsView.prototype.update_trackers = function() {
        this.connection.rpc({
            method: "torrent.getTrackers",
            params: [ this.infoHash ],
            success: function(trackers) {
                for(var i = 0; i < trackers.length; i++) {
                    var key =  trackers[i].tier + "_" + trackers[i].url;

                    if(this.trackers[key]) {
                        this.trackers[key] = trackers[i];
                        this.updateTrackerRow(this.trackers[key]);
                    } else {
                        this.trackers[key] = trackers[i];
                        this.addTrackerRow(this.trackers[key]);
                    }
                }
            }.bind(this),
            error: function(xhr, status, error) {
                Hadouken.utils.connectionLost(xhr, status, error);
                this.unload();
            }.bind(this)
        });
    }

    TorrentDetailsView.prototype.getFilePriority = function(prio) {
        switch(prio) {
            case 0:
                return "Do not download";
            case 1:
                return "Normal";
            default:
                return "High";  
        }
    }

    TorrentDetailsView.prototype.addFileRow = function(file) {
        var tmpl = $($("#fileItemTemplate").html());
        tmpl.attr("data-file-index", file.index);

        $("#fileList").append(tmpl);
        this.updateFileRow(file);
    };

    TorrentDetailsView.prototype.updateFileRow = function(file) {
        var row = $("#fileList > tr[data-file-index='" + file.index + "']");

        row.find(".fileName").text(file.path);
        row.find(".fileSize").text(Hadouken.utils.toFileSize(file.size));

        row.find(".filePriority").text(this.getFilePriority(file.priority));

        var progress = file.progress / file.size;

        row.find(".progress-bar")
            .css({ width: (progress * 100 | 0) + '%'})
            .text((progress * 100 | 0) + '%');
    };

    TorrentDetailsView.prototype.addPeerRow = function(peer) {
        var tmpl = $($("#peerItemTemplate").html());
        tmpl.attr("data-peer-id", peer.ip + ":" + peer.port);

        $("#peerList").append(tmpl);
        this.updatePeerRow(peer);
    };

    TorrentDetailsView.prototype.updatePeerRow = function(peer) {
        var row = $("#peerList > tr[data-peer-id='" + peer.ip + ":" + peer.port + "']");

        row.find(".peerRemote").text(peer.ip + ":" + peer.port);
        row.find(".peerCountry").attr("src", "images/flags/" + peer.country.toLowerCase() + ".png");
        row.find(".peerClient").text(peer.client);
    };

    TorrentDetailsView.prototype.removePeerRow = function(peerKey) {
        $("#peerList > tr[data-peer-id='" + peerKey + "']").remove();
    };

    TorrentDetailsView.prototype.addTrackerRow = function(tracker) {
        var tmpl = $($("#trackerItemTemplate").html());
        tmpl.attr("data-tracker-id", tracker.tier + "_" + tracker.url);

        $("#trackerList").append(tmpl);
        this.updateTrackerRow(tracker);
    };

    TorrentDetailsView.prototype.updateTrackerRow = function(tracker) {
        var row = $("#trackerList > tr[data-tracker-id='" + tracker.tier + "_" + tracker.url + "']");

        var message = tracker.message;

        if(tracker.isUpdating) {
            message = "Updating...";
        }

        row.find(".trackerUrl").text(tracker.url);
        row.find(".trackerMessage").text(message);
        row.find(".trackerTier").text(tracker.tier);
    };    

    Hadouken.Views.TorrentDetailsView = TorrentDetailsView;

})(window.jQuery, window.Hadouken);
