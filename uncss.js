var uncss = require('uncss');

var files   = ['index.html'],
    options = {
        stylesheets  : ['css/app-blogs.css','css/cli-style.css','css/custom.css','css/gef.css','css/font-awesome.min.css'],
        ignore       : [],
    };

uncss(files, options, function (error, output) {
    //console.log(output.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '').replace(/\n/g, '').replace(/\r/g, '').replace(/\s\s+/g, ' '));
    console.log(output.replace(/\n/g, '').replace(/\r/g, '').replace(/\s\s+/g, ' '));
});