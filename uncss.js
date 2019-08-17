var uncss = require('uncss');

var files   = ['index.html'],
    options = {
        stylesheets  : ['css/full/app-blogs.css','css/full/cli-style.css','css/full/gef.css','css/full/font-awesome.min.css','css/full/custom.css'],
    ignore       : [/#browser(.*)/,/(.*)hover(.*)/, /ftps3_upload(.*)/,/\.loading(.*)/,/(.*)keyframes(.*)/],
    };

uncss(files, options, function (error, output) {
    console.log(output
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        .replace(/\/\*(.*?)\*\//g,"")
        .replace(/\s\s+/g, ' ')
        .replace(/\t\t+/g, '')
    );
});