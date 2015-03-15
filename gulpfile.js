var gulp  = require("gulp");
var util = require("gulp-util");
var ftp   = require("gulp-ftp");
var serve = require("gulp-serve");

var config = require("./config.json");

gulp.task("deploy", function() {
    return gulp.src("public/**/*")
               .pipe(ftp({
                   host: config.ftp.host,
                   user: config.ftp.user,
                   pass: config.ftp.pass,
                   remotePath: config.ftp.remotePath
               }))
               .pipe(util.noop());
});

gulp.task("serve", serve("public"));
