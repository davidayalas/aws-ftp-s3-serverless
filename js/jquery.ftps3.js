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
    var explorer = null;
    var uploadcounter = 0;

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
                uploadarea_message_selector: "",
                logarea_selector : "",
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

           explorer = $(settings.browser_selector);
       }
       return {
            getKeys : function(path, refresh){_getKeys(path, refresh);},
            setUpload : function(){_setUpload();},
            deleteKeys : function(){_deleteAll();},
            createFolder : function(){_createFolderInput();},
            getExplorer : function(){return explorer;},
            uploadcounter :  {
                get : function(){
                    return uploadcounter;
                },
                set : function(uc){
                    uploadcounter = uc;
                },
                add : function(_add){
                    $.ftps3().uploadcounter.set($.ftps3().uploadcounter.get()+_add);
                }
            }
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
        var querystring = "";

        if(refresh){
            path = settings.currentDir;
        }

        if(path && path.slice(-1)==="/"){
            path = path.slice(0, path.length-1)
        }
    
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

    var _bytesToSize = function(bytes) {
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes == 0){return '0 Byte';}
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };

    var _getDate = function(_date){
        _date = new Date(_date);
        return ('0' + _date.getDate()).slice(-2) + "/" + ('0'+(_date.getMonth()+1)).slice(-2) +  "/" + _date.getFullYear() + " - " + ('0' + _date.getHours()).slice(-2) + ":" + ('0' + _date.getMinutes()).slice(-2);
    }

    var _drawExplorer = function(data){
        var explorer = $.ftps3().getExplorer();
        $(explorer).html("");
        $("<table id='"+settings.browser_selector.slice(1)+"-toc'></table>").appendTo(explorer);

        var toc = $(settings.browser_selector+"-toc");
        var keyRoot = settings.key_root; //to remove from prefixes and contents due our interaction with our lambdas (and security--> root=user email)
        var aux;
    
        var isRoot = (data.Prefix.replace(keyRoot+"/","")==="" ? true : false);
    
        var parent = data.Prefix.slice(0,data.Prefix.length-1);
        parent = parent.slice(0,parent.lastIndexOf("/")).replace(keyRoot,"").replace("/","");
    
        settings.currentDir = data.Prefix.replace(keyRoot+"/","");

        if(settings.currentDir!==""){
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
            $("<tr><td class='ftps3-path' colspan='2'><a href='#' onclick='$.ftps3().getKeys(\"/\")'><i class='fa fa-home'></i></a> <i class='fa fa-angle-right'></i> "+breadcrumbs_items.join(" <i class='fa fa-angle-right'></i> ")+"</td></tr>").appendTo(toc);
        }else{
            $("<tr><td class='ftps3-path' colspan='2'><i class='fa fa-home'></i></td></tr>").appendTo(toc);
        }

        if(!isRoot){
            $("<tr><td class='ftps3-parent-folder' colspan='2'><i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='$.ftps3().getKeys(\""+parent+"\")'>..</a></td></tr>").appendTo(toc);
        }
    
        var currentPath = "";
        for(var i=0,z=data.CommonPrefixes.length;i<z;i++){
            aux = data.CommonPrefixes[i].Prefix.replace(data.Prefix,"");
            if(aux.slice(-1)==="/"){
                aux = aux.slice(0,aux.length-1);
            }
            currentPath = data.CommonPrefixes[i].Prefix.replace(keyRoot+"/","");
            $("<tr class='ftps3-item-folder'><td colspan='2'><input type='checkbox' value='"+currentPath+"' class='ftps3-todelete' /> <i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='$.ftps3().getKeys(\""+settings.currentDir+aux+"\")'>" + aux + "</a></td></tr>").appendTo(toc);
        }
    
        var _date;
        for(var i=0,z=data.Contents.length;i<z;i++){
            aux = data.Contents[i].Key.slice(data.Contents[i].Key.lastIndexOf("/")+1);
            if(aux!==""){
                $("<tr class='ftps3-item-file'><td class='ftps3-item-filename'><input type='checkbox' class='ftps3-todelete' value='"+data.Contents[i].Key.replace(keyRoot+"/","") + "'/> <i class='fa fa-file' aria-hidden='true'></i> " + aux + "</td><td class='ftps3-item-filesize'>"+ _bytesToSize(data.Contents[i].Size) +"</td><td class='ftps3-item-date'>"+_getDate(data.Contents[i].LastModified)+"</td></tr>").appendTo(toc);
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
            //$(settings.logarea_selector).html("");
            //var file = e.originalEvent.dataTransfer.files;
            var items = event.dataTransfer.items;
            $.ftps3().uploadcounter.set(0);
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
          $.ftps3().uploadcounter.add(1);
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
    
    var cleanName = function(_name){
        return _name
            .replace(/\./g,"-")
            .replace(/\$/g,"-")
        ;
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
        if(settings.logarea_selector){
            $("<p><span class='ftps3-upload-log-"+cleanName(file.name)+"'>Uploading </span> " + path + file.name + "</p>").prependTo($(settings.logarea_selector));
        }
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
                $.ftps3().uploadcounter.add(-1);
                if(settings.logarea_selector){
                    $(".ftps3-upload-log-"+cleanName(formdata.get("file").name)).html("Uploaded");
                }
                $(settings.uploadarea_message_selector).text(settings.messages.onfinish);
                if($.ftps3().uploadcounter.get()===0){
                    $.ftps3().getKeys("", true);
                }
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
                    $(".ftps3-delete-log-item").html("Deleted");
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
                if(settings.logarea_selector){
                    $("<p><span class='ftps3-delete-log-item'>Deleting</span> " + this.value + "</p>").prependTo($(settings.logarea_selector));
                }

            });
            _deleteKeys(keys)
        }
    }
}(jQuery));
