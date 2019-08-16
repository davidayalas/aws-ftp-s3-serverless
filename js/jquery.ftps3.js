/*!
 * jQuery plugin to encapsulate "FTP Serverless" functionality.
 * Original authors: @davidayalas & @asamo7
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
    var queue = [];
    var queue_counter = 0;

    /*
    * Upload queue management
    */
    var uploadqueue = {
        push : function(item){
            queue.push(item);
        },
        length : function(){
            return queue.length;
        },
        process: function(c){
            if(c){
                queue_counter = queue_counter+c;
            }
            _processUploadQueue();
        },
        startNewQueue: function(){
            if(queue_counter<settings.max_upload_threads){
                return true;
            }
            return false;
        },
        queuesLength: function(reset){
            if(reset){
                queue_counter = 0;
            }
            return queue_counter;
        },
        getItem: function(){
            return queue.shift();
        }
    }    

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
                max_upload_threads : 10,
                messages: {
                    "dragover_html" : "Drag here",
                    "dragarea" : "Drag file/folder or click",
                    "dragenter" : "Drop",
                    "dragover_uploadarea" : "Drop",
                    "ondrop" : "Upload",
                    "onuploading" : "Uploading...",
                    "onfinish" : "Uploaded!",
                    "ondelete" : "Are you sure you want to delete key/s?"
                },
                initActionHook : function(){},
                endActionHook : function(){}
            }
        
        */
       if(!settings.auth_token){
           settings = $.extend(true, {
            max_upload_threads : 10,
            messages: {
                "dragover_html" : "Drag here",
                "dragarea" : "Drag file/folder or click",
                "dragenter" : "Drop",
                "dragover_uploadarea" : "Drop",
                "ondrop" : "Upload",
                "onuploading" : "Uploading...",
                "onfinish" : "Uploaded!",
                "ondelete" : "Are you sure you want to delete key/s?",
                "folder_prompt" : "Folder name?",
                "folder_prompt_value" : "folder"
            },
            initActionHook : function(){},
            endActionHook : function(){}                          
           }, options);

           explorer = $(settings.browser_selector);

           if(settings.initActionHook && typeof settings.initActionHook==="function"){
               settings.loading = function(){
                  settings.initActionHook();
               };
           }

           if(settings.endActionHook && typeof settings.endActionHook==="function"){
            settings.endLoading = function(){
               settings.endActionHook();
            };
        }

       }

       return {
            getKeys : function(path, refresh){_getKeys(path, refresh);},
            setUpload : function(){_setUpload();},
            deleteKeys : function(){_deleteAll();},
            createFolder : function(){_createFolderInput();},
            getExplorer : function(){return explorer;},
       }
    }

    /*
    * Common request ajax wrapper
    */
    var _request = function(method, endpoint, callback, body, _opts, signedRequest){
        var options = {
            "type": method, 
            "url": endpoint,
            "headers": {
                "Authorization": settings.auth_token
            },     
            "dataType": 'json',
            "crossDomain": true,
            "contentType": 'application/json',
            "error": function(e) {
                if(e.status===401){
                    window.location.reload();
                }
            },       
            "success": function(data){
                if(typeof callback==="function"){callback(data);}
            }
        };
        if(body){options.data = body;}
        if(_opts){
            for(var k in _opts){
                options[k] = _opts[k];
            }
        }
        if(signedRequest){delete options.headers["Authorization"];}
        $.ajax(options);
    }

    /*
    * Create a folder in route
    */
    var _createFolderInput = function(){
        var folder = prompt(settings.folder_prompt, settings.folder_value);
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
            path = path.slice(0, path.length-1);
        }
    
        if(path){
            querystring = "?path=" + path; 
        }
    
        // TODO param continuationToken is available on lambda endpoint

        settings.loading();

        _request("GET", settings.endpoint_browse+querystring, function(data){
            _drawExplorer(data);            
            settings.endLoading();
        });
    }

    /*
    * aux function to get size from bytes
    */
    var _bytesToSize = function(bytes) {
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes == 0){return '0 Byte';}
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };

    /*
    * aux function to format data
    */
    var _getDate = function(_date){
        _date = new Date(_date);
        return ('0' + _date.getDate()).slice(-2) + "/" + ('0'+(_date.getMonth()+1)).slice(-2) +  "/" + _date.getFullYear() + " - " + ('0' + _date.getHours()).slice(-2) + ":" + ('0' + _date.getMinutes()).slice(-2);
    }

    /*
    * draw explorer into DOM selector
    */
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

        // creates input file type
        $('<input type="file" name="file" id="ftps3_uploadfile" multiple style="display:none" />').appendTo($(settings.uploadarea_selector).parent());

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
            var items = event.dataTransfer.items;
            settings.loading();            
            for (var i=0; i<items.length; i++) {
                var item = items[i].webkitGetAsEntry();
                if (item) {
                    _traverseFileTree(item);
                }
            } 
        });

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

    /* 
    * process items in queue[]
    */
    var _processUploadQueue = function() {
        var item = uploadqueue.getItem();
        if(!item){
            uploadqueue.queuesLength(true);
            $(settings.uploadarea_message_selector).text(settings.messages.dragarea);
            _getKeys("",true);
            return;
        }
        uploadData(item[0], item[1], function(){
            _processUploadQueue();
        });
    }

    /*
    * Loop over selected files and folders
    */ 
    var _traverseFileTree = function(item, path) {
        path = path || "";
        if (item.isFile) {
          // Get and upload file
          item.file(function(file) {
            uploadqueue.push([file, path]);
            if(((uploadqueue.length() % 100)===0 && uploadqueue.startNewQueue()) || uploadqueue.queuesLength()===0){
                uploadqueue.process(1); //add a queue process until "max_upload_threads"
            }
          });
        
        } else if (item.isDirectory) {
          // Get folder contents
          var dirReader = item.createReader();
          var readEntries = function(){
            dirReader.readEntries(function(entries) {
                if(entries.length===100){ //limit for call
                    readEntries();
                }
                for (var i=0; i<entries.length; i++) {
                    _traverseFileTree(entries[i], path + item.name + "/");
              }
            });
          }
          readEntries();
        }
    }

    /*
    * Gets upload signed data from backend --> https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-post-example.html
    */
    var _getUploadForm = function(callback){
        _request("GET", settings.endpoint_signedform + "?success_redirect=", function(data){
            settings.signedFormData = data;
            if(typeof callback==="function"){
                callback();
            }
        });
    }
    
    /* 
    * Aux function to clean name in order to put it as css classname
    */
    var cleanName = function(_name){
        return _name
            .replace(/\./g,"-")
            .replace(/\$/g,"-")
        ;
    }

    /* 
    * Generates form data to send with ajax request
    */
    var _generateFormData = function(_fnUpload, file, path, cb){
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
        _fnUpload(fd, cb);
    }
    
    /*
    * Ajax function to upload form data signed
    */
    var _ajaxUploadPost = function(formdata, cb){
        $(settings.uploadarea_message_selector).text(settings.messages.onuploading);
        _request("POST", settings.signedFormData.endpoint, function(response){
            if(settings.logarea_selector){
                $(".ftps3-upload-log-"+cleanName(formdata.get("file").name)).html("Uploaded");
            }
            $(settings.uploadarea_message_selector).text(settings.messages.onfinish);
            cb();
        }, formdata, {processData:false,contentType:false}, true);
    }      
 
    var uploadData = function(file, path, cb){
        if(!settings.signedFormData){
            _getUploadForm(function(){_generateFormData(_ajaxUploadPost,file,path,cb)});
        }else{
            _generateFormData(_ajaxUploadPost,file,path,cb);
        }
    }

    /* 
    * Delete management. 
    * Gets all keys checked (input.ftps3-todelete:checked) and sends to lambda backend. 
    * POST better than DELETE because we need send body
    */
    var _deleteKeys = function(keys){
        if(!keys){return;}
        _request("POST", settings.endpoint_delete, function(data){
            if(data.message==="done"){
                $(".ftps3-delete-log-item").html("Deleted");
                _getKeys(settings.currentDir);
            }
        }, JSON.stringify({"keys" : keys}));
    }
    

    /*
    * Get all files to delete from interface
    */
    var _deleteAll = function(){
        var message=settings.messages.ondelete;
        if($(settings.browser_selector + " input.ftps3-todelete:checked").length>0 && window.confirm(message)){
            settings.loading(); 
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