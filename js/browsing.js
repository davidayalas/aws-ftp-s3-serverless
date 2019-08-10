function getFiles(){
    console.log(window.localStorage.getItem("token"))
    $.ajax({
        type: "GET", 
        url: "https://favyoweaj6.execute-api.eu-west-1.amazonaws.com/dev/getfiles",
        headers: {
            "Authorization": window.localStorage.getItem("token")
        },     
        dataType: 'json',
        crossDomain: true,
        withCredentials: true,
        contentType: 'application/json',
        error: function(e) {
            console.log(e)
        },       
        success: function(data){
            console.log(data);
            drawExplorer(data);            
        } 
    });
}

function drawExplorer(files){
    var explorer = $("#browser");
    $(explorer).html("");

    var email = window.localStorage.getItem("token_email");
    var aux;
    /*<i class="fa fa-folder" aria-hidden="true"></i>
    <i class="fa fa-file" aria-hidden="true"></i>*/
    for(var i=0,z=files.length;i<z;i++){
        aux = files[i].key.replace(email+"/","");
        if(aux.lastIndexOf("/")===(aux.length-1)){ //folder
            if(aux!==""){
                $("<p><i class='fa fa-folder' aria-hidden='true'></i> " + aux + "</p>").appendTo(explorer);
            }
        }else{
            $("<p><i class='fa fa-file' aria-hidden='true'></i> " + aux + "</p>").appendTo(explorer);
        }
    }    
}
