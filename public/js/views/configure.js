
(function($, Hadouken) { 
    Hadouken.Views = Hadouken.Views || {};

    function ConfigureView() {
        this.cfg = new Hadouken.Config();
        this.load();
    }

    ConfigureView.prototype.load = function() {
        Hadouken.loadPage("configure.html", "#content", function () {
            $("#remoteInfo").hide();

            $("#authType").change(function () {
                $(".auth-type-container").hide();
                $("#auth-type-" + $(this).val()).show();
            });

            $("#url").val(this.cfg.get("http.remote.url", "http://localhost:7070/api"));
            $("#authType").val(this.cfg.get("http.remote.auth.type", "none")).change();
            $("#basicUserName").val(this.cfg.get("http.remote.auth.basic.userName"));
            $("#basicPassword").val(this.cfg.get("http.remote.auth.basic.password"));
            $("#token").val(this.cfg.get("http.remote.auth.token"));

            $("#saveConfig").click(function () {
                this.cfg.set("http.remote.url", $("#url").val());
                this.cfg.set("http.remote.auth.type", $("#authType").val());
                this.cfg.set("ui.configured", true);

                if ($("#authType").val() === "basic") {
                    this.cfg.set("http.remote.auth.basic.userName", $("#basicUserName").val());
                    this.cfg.set("http.remote.auth.basic.password", $("#basicPassword").val());
                } else if ($("#authType").val() === "token") {
                    this.cfg.set("http.remote.auth.token", $("#token").val());
                }

                $("#configure-intro").hide();
            }.bind(this));

            $("#testConfig").click(function () {
                var url = $("#url").val();
                var authType = $("#authType").val();
                var connection;

                if (authType === "basic") {
                    var user = $("#basicUserName").val();
                    var pass = $("#basicPassword").val();
                    connection = new Hadouken.Connection(url, "Basic " + btoa(user + ":" + pass));
                } else if(authType === "token") {
                    var token= $("#token").val();
                    connection = new Hadouken.Connection(url, "Token " + token);
                } else {
                    connection = new Hadouken.Connection(url, "");
                }

                connection.rpc({
                    method: "core.getSystemInfo",
                    params: [],
                    success: function (d) {
                        this.showStatus("OK! Found Hadouken v" + d.versions.hadouken);
                    }.bind(this),
                    error: function (xhr, status, error) {
                        if(status === "error" && error === "Unauthorized") {
                            this.showStatus("Error! Unauthorized.");
                        }
                    }.bind(this)
                });
            }.bind(this));
        }.bind(this));
    };

    ConfigureView.prototype.showStatus = function(status) {
        $("#statusInfo").text(status).show();
        setTimeout(function () { $("#statusInfo").fadeOut(); }, 1000);
    }

    Hadouken.Views.ConfigureView = ConfigureView;

})(window.jQuery, window.Hadouken);
