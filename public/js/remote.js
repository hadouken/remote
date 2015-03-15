var currentView;

$(document).ready(function () {
    var routes = {
        "/": function() { loadView(Hadouken.Views.TorrentsView, arguments); },
        "/torrents/:infoHash": function() { loadView(Hadouken.Views.TorrentDetailsView, arguments); },
        "/configure": function() { loadView(Hadouken.Views.ConfigureView, arguments); }
    };

    var router = new Router(routes);
    router.init();

    if(!window.location.hash) {
        window.location.hash = "#/";
    }
});

function construct(constructor, args) {
    function F() {
        return constructor.apply(this, args);
    }
    F.prototype = constructor.prototype;
    return new F();
}

function loadView(view, args) {
    if(currentView && currentView.unload) {
        currentView.unload();
    }

    currentView = construct(view, args);
    currentView.load();
}

function loadPage(url, container, callback) {
    callback = callback || Function.from();

    $.get(url, function (html) {
        $(container).html(html);
        callback();
    });
}
