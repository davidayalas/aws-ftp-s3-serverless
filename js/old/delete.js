function deleteKeys(keys){
    if(!keys){
        return;
    }
    $.ajax({
        type: "POST", 
        url: "https://favyoweaj6.execute-api.eu-west-1.amazonaws.com/dev/deletekeys",
        headers: {
            "Authorization": window.localStorage.getItem("token")
        },     
        dataType: 'json',
        crossDomain: true,
        withCredentials: true,
        contentType: 'application/json',
        data: JSON.stringify({"keys" : keys}),
        error: function(e) {
        },       
        success: function(data){
            if(data.message==="done"){
                getFiles(window.currentDir);
            }
        } 
    });
}

function deleteAll(){
    var message="Segur que vols eliminar els fitxers?";
    if($("input.toDelete:checked").length>0 && window.confirm(message)){
        var keys = [];
        $("input.toDelete:checked").each(function(){
            keys.push(this.value);
        });
        deleteKeys(keys)
    }
}