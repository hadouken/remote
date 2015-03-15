(function($, Hadouken) {
    Hadouken.Views = Hadouken.Views || {};

    var cfg = new Hadouken.Config();

    function TorrentDetailsView(infoHash) {
        this.timer = null;
        this.infoHash = infoHash;
    }

    TorrentDetailsView.prototype.load = function() {
        console.log(this.infoHash);
    };

    TorrentDetailsView.prototype.unload = function() {
        clearInterval(this.timer);
    }


    Hadouken.Views.TorrentDetailsView = TorrentDetailsView;

})(window.jQuery, window.Hadouken);
