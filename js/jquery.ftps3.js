/*!
 * jQuery plugin to encapsulate "FTP Serverless" functionality.
 * Original authors: @davidayalas @asamo7
 * Licensed under the MIT license
 */

/*
 * Out goal is to provide a "FTP" interface to users. 
 * Under a bucket, users have access only to their "folder", in our case their "email" from SAML assertion. 
 * This field is the option param "key_root"
*/ 

(function($){

    var settings = {};

    $.ftps3 = function(options) {
        /*
            options = {
                endpoint_signedform : "",
                endpoint_browse : "",
                endpoint_delete : "",
                auth_token : "",
                key_root : "",
                browser_selector: ""
                uploadarea_selector: "",
                uploadarea_message_selector: ""
            }
        
        */
       if(!settings.auth_token){
           settings = $.extend({}, options);
       }
       return {
            getKeys : function(path){_getKeys(path);},
            setUpload : function(){_setUpload();},
            deleteKeys : function(){_deleteAll();}
       }
    }

    /* Browse keys and draw */
    var _getKeys = function(path, refresh){
        if(refresh){
            path = settings.currentDir;
        }
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
            url: settings.endpoint_browse+querystring,
            headers: {
                "Authorization": settings.auth_token
            },     
            dataType: 'json',
            crossDomain: true,
            withCredentials: true,
            contentType: 'application/json',
            error: function(e) {
            },       
            success: function(data){
                drawExplorer(data);            
            } 
        });
    }

    var drawExplorer = function(data){
        var explorer = $(settings.browser_selector);
        $(explorer).html("");
    
        var keyRoot = settings.key_root; //to remove due our interactions with our lambdas
        var aux;
    
        var isRoot = (data.Prefix.replace(keyRoot+"/","")==="" ? true : false);
    
        var parent = data.Prefix.slice(0,data.Prefix.length-1);
        parent = parent.slice(0,parent.lastIndexOf("/")).replace(keyRoot,"").replace("/","");
    
        settings.currentDir = data.Prefix.replace(keyRoot+"/","");
        var currentPath = "";

        if(settings.currentDir!==""){
            $("<p><i class='fa fa-angle-right'></i> "+settings.currentDir+"</p>").appendTo(explorer);
        }

        if(!isRoot){
            $("<p><i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='$.ftps3().getKeys(\""+parent+"\")'>..</a></p>").appendTo(explorer);
        }
    
        for(var i=0,z=data.CommonPrefixes.length;i<z;i++){
            aux = data.CommonPrefixes[i].Prefix.replace(data.Prefix,"");
            if(aux.slice(-1)==="/"){
                aux = aux.slice(0,aux.length-1);
            }
            currentPath = data.CommonPrefixes[i].Prefix.replace(keyRoot+"/","");
            $("<p><input type='checkbox' value='"+currentPath+"' class='toDelete'/> <i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='$.ftps3().getKeys(\""+settings.currentDir+aux+"\")'>" + aux + "</a></p>").appendTo(explorer);
        }
    
        for(var i=0,z=data.Contents.length;i<z;i++){
            aux = data.Contents[i].Key.slice(data.Contents[i].Key.lastIndexOf("/")+1);
            if(aux!==""){
                $("<p><input type='checkbox' class='toDelete' value='"+data.Contents[i].Key.replace(keyRoot+"/","")+"'/> <i class='fa fa-file' aria-hidden='true'></i> " + aux + "</p>").appendTo(explorer);
            }
        }    
    }

    /* UPLOAD MANAGEMENT */
    var _setUpload = function(){
        // preventing page from redirecting
        $("html").on("dragover", function(e) {
            e.preventDefault();
            e.stopPropagation();
            $(settings.uploadarea_message_selector).text("Drag here");
        });

        $("html").on("drop", function(e) { e.preventDefault(); e.stopPropagation(); });

        // Drag enter
        $(settings.uploadarea_selector).on('dragenter', function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(settings.uploadarea_message_selector).text("Drop");
        });

        // Drag over
        $(settings.uploadarea_selector).on('dragover', function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(settings.uploadarea_message_selector).text("Drop");
        });

        // Drop
        $(settings.uploadarea_selector).on('drop', function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(settings.uploadarea_message_selector).text("Upload");
            //var file = e.originalEvent.dataTransfer.files;
            var items = event.dataTransfer.items;
            for (var i=0; i<items.length; i++) {
            // webkitGetAsEntry is where the magic happens
            var item = items[i].webkitGetAsEntry();
            if (item) {
                _traverseFileTree(item);
            }
            } 
        });

        $('<input type="file" name="file" id="ftps3_uploadfile" multiple style="display:none" />').appendTo($(settings.uploadarea_selector).parent());

        // Open file selector on div click
        $(settings.uploadarea_selector).click(function(){
            $("#ftps3_uploadfile").click();
        });

        // file selected
        $("#ftps3_uploadfile").change(function(){
            var items = $('#ftps3_uploadfile')[0].files;
            for (var i=0; i<items.length; i++) {
            uploadData(items[i], items[i].webkitRelativePath.replace(items[i].name,""));
            } 
        });
    }

    var _traverseFileTree = function(item, path) {
        path = path || "";
        if (item.isFile) {
          // Get file
          item.file(function(file) {
            uploadData(file, path);
          });
        } else if (item.isDirectory) {
          // Get folder contents
          var dirReader = item.createReader();
          dirReader.readEntries(function(entries) {
            for (var i=0; i<entries.length; i++) {
                _traverseFileTree(entries[i], path + item.name + "/");
            }
          });
        }
      }

      //Gets upload signed data from backend
      var _getUploadForm = function(callback){
        $.ajax({
            type: "GET", 
            url: settings.endpoint_signedform + "?success_redirect=",
            headers: {
                "Authorization": settings.auth_token
            },   
            dataType: 'json',
            crossDomain: true,
            contentType: 'application/json',
            error: function(e) {
            },       
            success: function(data){
                settings.signedFormData = data;
                if(typeof callback==="function"){
                    callback();
                }
            } 
        });
    }
    
    var _generateFormData = function(_fnUpload, file, path){
        path = settings.currentDir + path;
        var fd = new FormData();
        for(var k in settings.signedFormData){
            if(["endpoint"].indexOf(k)===-1){
                if(k==="key"){
                    fd.append(k, settings.signedFormData[k].replace("/","/"+path));
                }else{
                    fd.append(k, settings.signedFormData[k]);
                }
            }
        }
        fd.append('file', file);
        _fnUpload(fd);
    }
    
    var _ajaxUploadPost = function(formdata){
        $(settings.uploadarea_message_selector).text("Uploading...");
        $.ajax({
            url: settings.signedFormData.endpoint,
            type: 'POST',
            data: formdata,
            processData: false,
            dataType: 'json',
            contentType: false,
            success: function(response){
                $(settings.uploadarea_message_selector).text("Uploaded!");
            }
        });
    }      
 
    var uploadData = function(file, path){
        if(!settings.signedFormData){
            _getUploadForm(function(){_generateFormData(_ajaxUploadPost,file,path)});
        }else{
            _generateFormData(_ajaxUploadPost,file,path);
        }
    }

    /* DELETE MANAGEMENT */
    var _deleteKeys = function(keys){
        if(!keys){
            return;
        }
        $.ajax({
            type: "POST", 
            url: settings.endpoint_delete,
            headers: {
                "Authorization": settings.auth_token
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
                    _getKeys(settings.currentDir);
                }
            } 
        });
    }
    
    var _deleteAll = function(){
        var message="Segur que vols eliminar els fitxers?";
        if($(settings.browser_selector + " input.toDelete:checked").length>0 && window.confirm(message)){
            var keys = [];
            $(settings.browser_selector + " input.toDelete:checked").each(function(item){
                keys.push(this.value);
            });
            _deleteKeys(keys)
        }
    }
}(jQuery));
