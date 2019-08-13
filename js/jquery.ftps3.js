/*!
 * jQuery plugin to encapsulate "FTP Serverless" functionality.
 * Original authors: @davidayalas @asamo7
 * Licensed under the MIT license
 */

/*
 * Out goal is to provide a "FTP" interface to users. 
 * Under a bucket, users have access only to their "folder", in our case their "email" from SAML or OAuth. 
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
                messages: {
                    "dragover_html" : "Drag here",
                    "dragenter" : "Drop",
                    "dragover_uploadarea" : "Drop",
                    "ondrop" : "Upload",
                    "onuploading" : "Uploading...",
                    "onfinish" : "Uploaded!",
                    "ondelete" : "Are you sure you want to delete key/s?"
                }
            }
        
        */
       if(!settings.auth_token){
           settings = $.extend(true, {
            messages: {
                "dragover_html" : "Drag here",
                "dragenter" : "Drop",
                "dragover_uploadarea" : "Drop",
                "ondrop" : "Upload",
                "onuploading" : "Uploading...",
                "onfinish" : "Uploaded!",
                "ondelete" : "Are you sure you want to delete key/s?"
            }               
           }, options);
       }
       return {
            getKeys : function(path, refresh){_getKeys(path, refresh);},
            setUpload : function(){_setUpload();},
            deleteKeys : function(){_deleteAll();},
            createFolder : function(){_createFolderInput();}
       }
    }

    var _createFolderInput = function(){
        var folder = prompt("Nom del directori", "directori");
        if(folder){
            uploadData(new File([""], ""),folder+"/");
        }
    }

    /* 
    * Get keys from backend and draws a simple interface
    */
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
    
        // TODO param continuationToken is available on lambda endpoint

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
                if(e.status===401){
                    window.location.reload();
                }
            },       
            success: function(data){
                _drawExplorer(data);            
            } 
        });
    }

    var _drawExplorer = function(data){
        var explorer = $(settings.browser_selector);
        $(explorer).html("");
    
        var keyRoot = settings.key_root; //to remove due our interaction with our lambdas
        var aux;
    
        var isRoot = (data.Prefix.replace(keyRoot+"/","")==="" ? true : false);
    
        var parent = data.Prefix.slice(0,data.Prefix.length-1);
        parent = parent.slice(0,parent.lastIndexOf("/")).replace(keyRoot,"").replace("/","");
    
        settings.currentDir = data.Prefix.replace(keyRoot+"/","");
        var currentPath = "";

        if(settings.currentDir!==""){
            console.log(settings.currentDir.split("/"))
            var breadcrumbs = settings.currentDir.split("/");
            var breadcrumbs_items = [];
            var breadcrumbs_path=[];
            for(var i=0,z=breadcrumbs.length;i<z;i++){
                if(breadcrumbs[i]===""){
                    continue;
                }
                breadcrumbs_path.push(breadcrumbs[i]);
                breadcrumbs_items.push((i<(z-2)?" <a href='#' onclick='$.ftps3().getKeys(\""+breadcrumbs_path.join("/")+"\")'>":"")+breadcrumbs[i]+(i<(z-2)?"</a>":""));
            }
            $("<p class='ftps3-path'><a href='#' onclick='$.ftps3().getKeys(\"/\")'><i class='fa fa-home'></i></a> <i class='fa fa-angle-right'></i> "+breadcrumbs_items.join(" <i class='fa fa-angle-right'></i> ")+"</p>").appendTo(explorer);
        }else{
            $("<p class='ftps3-path'><i class='fa fa-home'></i></p>").appendTo(explorer);
        }

        if(!isRoot){
            $("<p class='ftps3-parent-folder'><i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='$.ftps3().getKeys(\""+parent+"\")'>..</a></p>").appendTo(explorer);
        }
    
        for(var i=0,z=data.CommonPrefixes.length;i<z;i++){
            aux = data.CommonPrefixes[i].Prefix.replace(data.Prefix,"");
            if(aux.slice(-1)==="/"){
                aux = aux.slice(0,aux.length-1);
            }
            currentPath = data.CommonPrefixes[i].Prefix.replace(keyRoot+"/","");
            $("<p class='ftps3-item-folder'><input type='checkbox' value='"+currentPath+"' class='ftps3-todelete' /> <i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='$.ftps3().getKeys(\""+settings.currentDir+aux+"\")'>" + aux + "</a></p>").appendTo(explorer);
        }
    
        for(var i=0,z=data.Contents.length;i<z;i++){
            aux = data.Contents[i].Key.slice(data.Contents[i].Key.lastIndexOf("/")+1);
            if(aux!==""){
                $("<p class='ftps3-item-file'><input type='checkbox' class='ftps3-todelete' value='"+data.Contents[i].Key.replace(keyRoot+"/","")+"'/> <i class='fa fa-file' aria-hidden='true'></i> " + aux + "</p>").appendTo(explorer);
            }
        }    
    }

    /* 
    * Upload management interface
    * A drop zone is observer and you can drop or click (files or directories) that are uploaded automatically to S3
    */
    var _setUpload = function(){
        // preventing page from redirecting
        $("html").on("dragover", function(e) {
            e.preventDefault();
            e.stopPropagation();
            $(settings.uploadarea_message_selector).text(settings.messages.dragover_html);
        });

        $("html").on("drop", function(e) { e.preventDefault(); e.stopPropagation(); });

        // Drag enter
        $(settings.uploadarea_selector).on('dragenter', function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(settings.uploadarea_message_selector).text(settings.messages.dragenter);
        });

        // Drag over
        $(settings.uploadarea_selector).on('dragover', function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(settings.uploadarea_message_selector).text(settings.messages.dragover_uploadarea);
        });

        // Drop
        $(settings.uploadarea_selector).on('drop', function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(settings.uploadarea_message_selector).text(settings.messages.ondrop);
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
          // Get and upload file
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

      /*
      * Gets upload signed data from backend --> https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-post-example.html
      */
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
                if(e.status===401){
                    window.location.reload();
                }
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
        $(settings.uploadarea_message_selector).text(settings.messages.onuploading);
        $.ajax({
            url: settings.signedFormData.endpoint,
            type: 'POST',
            data: formdata,
            processData: false,
            dataType: 'json',
            contentType: false,
            success: function(response){
                $(settings.uploadarea_message_selector).text(settings.messages.onfinish);
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

    /* 
    * Delete management. 
    * Gets all keys checked (input.ftps3-todelete:checked) and sends to lambda backend. 
    * POST better than DELETE because we need send body
    */
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
                if(e.status===401){
                    window.location.reload();
                }
            },       
            success: function(data){
                if(data.message==="done"){
                    _getKeys(settings.currentDir);
                }
            } 
        });
    }
    
    var _deleteAll = function(){
        var message=settings.messages.ondelete;
        if($(settings.browser_selector + " input.ftps3-todelete:checked").length>0 && window.confirm(message)){
            var keys = [];
            $(settings.browser_selector + " input.ftps3-todelete:checked").each(function(item){
                keys.push(this.value);
            });
            _deleteKeys(keys)
        }
    }
}(jQuery));
