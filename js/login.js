var LoginWindow;
var logindomain = "https://2azu9l48b1.execute-api.eu-west-1.amazonaws.com"

function decoder(base64url) {
    try {
        var base64 = base64url.replace('-', '+').replace('_', '/')
        var utf8 = atob(base64)
        var json = JSON.parse(utf8)
        var json_string = JSON.stringify(json, null, 4)
    } catch (err) {
        json_string = "Bad Section.\nError: " + err.message
    }
    return json_string
}

window.addEventListener('message', function(e) {
    if(e.origin !== logindomain){
        return;
    }
    var message = JSON.parse(decoder(e.data.split(".")[1]));
    window.localStorage.setItem("token_ttl", message.exp);
    window.localStorage.setItem("token", e.data);
    window.localStorage.setItem("token_name", message["urn:oid:2.5.4.42"]);
    window.localStorage.setItem("token_email", message.nameID);
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
    LoginWindow = window.open(logindomain+"/pro/getJWT", title, 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);  
    // Puts focus on the newWindow  
    if (window.focus) {  
        LoginWindow.focus();  
    }  
}

$(document).ready(function(){
    $("#login").on("click", function(){
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
        $("#login_container").css("display","block");
        $("#browser_container").css("display","none");
    }else{
        $("#login_container").css("display","none");
        $("#browser_container").css("display","block");
        $("#browser_container h2").text("Hola " + window.localStorage.getItem("token_name"));
        //getUploadForm();

        $.ftps3({
            endpoint_signedform : "https://favyoweaj6.execute-api.eu-west-1.amazonaws.com/dev/getuploadform",
            endpoint_browse : "https://favyoweaj6.execute-api.eu-west-1.amazonaws.com/dev/getfiles",
            endpoint_delete : "https://favyoweaj6.execute-api.eu-west-1.amazonaws.com/dev/deletekeys",
            auth_token : window.localStorage.getItem("token"),
            key_root : window.localStorage.getItem("token_email"),
            browser_selector: "#browser",
            uploadarea_selector: ".upload-area",
            uploadarea_message_selector: ".upload-area h1",
            logarea_selector: ".log-area",
            max_upload_threads: 15,
            messages : {
                "ondelete" : "Segur que vols eliminar els fitxers?"
            }
        }).getKeys();

        $.ftps3().setUpload();
    }
}
