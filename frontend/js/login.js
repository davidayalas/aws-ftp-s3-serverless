var LoginWindow;

var _$ = function(_element){
    var element = null;

    var myDOM = {
        get : function(el){
            if(element) return element;
            return document.querySelectorAll(el);
        },
        addCss : function(style, value){
            [].forEach.call(element, function(el) {
                el.style[style] = value; // or add a class
            })
            return this;
        },
        removeClass : function(className){
            element.forEach(function(item){
                item.classList.remove(className);
            });
            return this;
        },
        addClass : function(className){
            element.forEach(function(item){
                item.classList.add(className);
            });
            return this;
        },
        text : function(str){
            [].forEach.call(element, function(el) {
                el.textContent = str;
            });
            return this;
        },        
        on : function(eventName, eventHandler){
            Array.prototype.forEach.call(element, function (item) {
                item.addEventListener(eventName, eventHandler);
            });
            return this;
        },
        ready : function(fn){
            if(document.readyState != 'loading'){
                fn();
            }else{
                document.addEventListener('DOMContentLoaded', fn);
            }
        }
    }

    element = myDOM.get(_element);
    return myDOM;
}

function decoder(base64url) {
    try {
        var base64 = base64url.replace('-', '+').replace('_', '/');
        var utf8 = atob(base64);
        var json = JSON.parse(utf8);
        var json_string = JSON.stringify(json, null, 4);
    } catch (err) {
        json_string = "Bad Section.\nError: " + err.message;
    }
    return json_string;
}

window.addEventListener('message', function(e) {
    if(e.origin !== endpoint){
        return;
    }
    var message = JSON.parse(decoder(e.data.split(".")[1]));
    window.localStorage.setItem("token_ttl", message.exp);
    window.localStorage.setItem("token", e.data);
    window.localStorage.setItem("token_name", message["urn:oid:2.5.4.42"]);
    window.localStorage.setItem("token_email", message["urn:oid:0.9.2342.19200300.100.1.3"]);
    LoginWindow.close();
    showName();
});

function Login(title, w, h){  
    // Fixes dual-screen position                         Most browsers      Firefox  
    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;  
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;  
            
    width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;  
    height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;  
            
    var left = ((width / 2) - (w / 2)) + dualScreenLeft;  
    var top = ((height / 2) - (h / 2)) + dualScreenTop;  
    LoginWindow = window.open(endpoint+"/demo/getJWT", title, 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);  
    // Puts focus on the newWindow  
    if (window.focus) {  
        LoginWindow.focus();  
    }  
}

_$().ready(function(){
    _$("#login").on("click", function(){
        Login("login",430,430);
        return false;
    });

    showName();
}); 

function showName(){
    var token_ttl=window.localStorage.getItem("token_ttl");
    if((+new Date()/1000)>token_ttl){
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("token_ttl");
        _$("#login_container").addCss("display","block");
        _$("#browser_container").addCss("display","none");
    }else{
        _$("#login_container").addCss("display","none");
        _$("#browser_container").addCss("display","block");
        _$("#browser_container h2").text("Hola " + window.localStorage.getItem("token_name"));

        ftps3({
            endpoint_signedform : endpoint + "/demo/getuploadform",
            endpoint_browse : endpoint +"/demo/getfiles",
            endpoint_delete : endpoint +"/demo/deletekeys",
            endpoint_getpresignedurls : endpoint +"/demo/getpresignedurls",         
            auth_token : window.localStorage.getItem("token"),
            key_root : window.localStorage.getItem("token_email"),
            browser_selector: "#browser",
            uploadarea_selector: ".upload-area",
            uploadarea_message_selector: ".upload-area h1",
            logarea_selector: ".log-area",
            max_upload_threads: 40,
            messages : {
                "ondelete" : "Sure?"
            },
            initActionHook : function(){
                _$("#loader").addClass("loading").addCss("display","block");
            },
            endActionHook : function(){
                _$("#loader").removeClass("loading").addCss("display","none");
            },
            messageHook : function(message){
                _$("#message").addCss("visibility","visible");
                _$("#message .message").text(message)
            }
        });
        ftps3().getKeys();
        ftps3().setUpload();
    }
}
