function getFiles(path){
    if(path && path.slice(-1)==="/"){
        path = path.slice(0, path.length-1)
    }

    var querystring = "";
    if(path){
        querystring = "?path=" + path; 
    }

    //continuationToken --> 

    $.ajax({
        type: "GET", 
        url: "https://favyoweaj6.execute-api.eu-west-1.amazonaws.com/dev/getfiles"+querystring,
        headers: {
            "Authorization": window.localStorage.getItem("token")
        },     
        dataType: 'json',
        crossDomain: true,
        withCredentials: true,
        contentType: 'application/json',
        error: function(e) {
            //console.log(e)
        },       
        success: function(data){
            //console.log(data);
            drawExplorer(data);            
        } 
    });
}

function drawExplorer(data){
    var explorer = $("#browser");
    $(explorer).html("");

    var email = window.localStorage.getItem("token_email");
    var aux;

    var isRoot = (data.Prefix.replace(email+"/","")==="" ? true : false);

    var parent = data.Prefix.slice(0,data.Prefix.length-1);
    parent = parent.slice(0,parent.lastIndexOf("/")).replace(email,"").replace("/","");

    window.currentDir = data.Prefix.replace(email+"/","");

    var currentPath = "";

    if(!isRoot){
        $("<p><i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='getFiles(\""+parent+"\")'>..</a></p>").appendTo(explorer);
    }

    for(var i=0,z=data.CommonPrefixes.length;i<z;i++){
        aux = data.CommonPrefixes[i].Prefix.replace(data.Prefix,"");
        if(aux.slice(-1)==="/"){
            aux = aux.slice(0,aux.length-1);
        }
        currentPath = data.CommonPrefixes[i].Prefix.replace(email+"/","");
        $("<p><input type='checkbox' value='"+currentPath+"' class='toDelete'/> <i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='getFiles(\""+currentDir+aux+"\")'>" + aux + "</a></p>").appendTo(explorer);
    }

    for(var i=0,z=data.Contents.length;i<z;i++){
        aux = data.Contents[i].Key.slice(data.Contents[i].Key.lastIndexOf("/")+1);
        if(aux!==""){
            $("<p><input type='checkbox' class='toDelete' value='"+data.Contents[i].Key.replace(email+"/","")+"'/> <i class='fa fa-file' aria-hidden='true'></i> " + aux + "</p>").appendTo(explorer);
        }
    }    
}
