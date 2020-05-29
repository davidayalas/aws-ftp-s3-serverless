/*!
 * Object to encapsulate "FTP Serverless" functionality.
 * Original authors: @davidayalas & @asamo7
 * Licensed under the MIT license
 */

/*
 * Out goal is to provide a "FTP" interface to users. 
 * Under an AWS S3 bucket, users have access only to their "folder", in our case their "email" from SAML or OAuth. 
 * This field is the option param "key_root"
*/ 

/*
    options = {
        endpoint_signedform : "your lambda or endpoint",
        endpoint_browse : "your lambda or endpoint",
        endpoint_delete : "your lambda or endpoint",
        endpoint_getpresignedurls : "your lambda or endpoint",
        auth_token : "auth token to validate againt api gw custom authorizer",
        //key_root : "in a bucket shared for some users, 'user key'",

        
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


(function(window){

    var settings = {            
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
            "folder_prompt_value" : "folder",
            "notAuthMsg" : "you are not authorized"
        },
        initActionHook : function(){},
        endActionHook : function(){}
    };
    var authorized = false;
    var explorer = null;
    var queue = [];
    var queue_counter = 0;
    var xhr = null;

    window.ftps3 = function(options) {
        if(!settings.auth_token){
            for(var k in options){
                if(typeof options[k]==="object"){
                    for(var z in options[k]){
                        settings[k][z] = options[k][z];
                    }
                }else{
                settings[k] = options[k];
                }
            }
            explorer = _$(settings.browser_selector);

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

            if(settings.messageHook && typeof settings.messageHook==="function"){
                settings.message = function(msg){
                    settings.messageHook(msg);
                };
            }
        }
        return {
            getKeys : function(path, refresh){_getKeys(path, refresh);},
            setUpload : function(){_setUpload();},
            deleteKeys : function(){_deleteSelected();},
            createFolder : function(){_createFolderInput();},
            downloadKeys : function(){_downloadSelected();},
            getExplorer : function(){return explorer;},
        }
    }

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
            return queue.pop();
        }
    }    

    var _$ = function(_element){
        var element = null;

        var myDOM = {
            get : function(el){
                if(element) return element;
                return document.querySelectorAll(el);
            },
            append : function(strHTML){
                if(!element){return this;}
                [].forEach.call(element, function(el) {
                    el.insertAdjacentHTML('beforeend', strHTML);
                }); 
                return this;
            },
            prepend : function(strHTML){
                if(!element){return this;}
                [].forEach.call(element, function(el) {
                    el.insertAdjacentHTML('afterbegin', strHTML);
                }); 
                return this;
            },
            insertBefore : function(strHTML){
                if(!element){return this;}
                [].forEach.call(element, function(el) {
                    el.insertAdjacentHTML('beforebegin', strHTML);
                });
                return this;
            },
            addCss : function(style, value){
                if(!element){return this;}
                [].forEach.call(element, function(el) {
                    el.style[style] = value; // or add a class
                })
                return this;
            },
            removeClass : function(className){
                if(!element){return this;}
                element.forEach(function(item){
                    item.classList.remove(className);
                });
                return this;
            },
            addClass : function(className){
                if(!element){return this;}
                element.forEach(function(item){
                    item.classList.add(className);
                });
                return this;
            },
            each : function(fn){
                if(!element){return this;}
                element.forEach(function(item){
                    fn(item);
                });
                return this;
            },
            on : function(eventName, eventHandler){
                if(!element){return this;}
                Array.prototype.forEach.call(element, function (item) {
                    item.addEventListener(eventName, eventHandler);
                });
                return this;
            },
            slice : function(start, end){
                if(!element){return this;}
                element = Array.from(element).slice(start, end);
                return this;
            },

            size : function(){
                if(!element){return 0;}
                return element.length;
            },

            empty : function(){
                if(!element){return this;}
                [].forEach.call(element, function(el) {
                    el.innerHTML = "";
                });
                return this;
            },
            html : function(str){
                if(!element){return this;}
                [].forEach.call(element, function(el) {
                    el.innerHTML = str;
                });
                return this;
            },
            text : function(str){
                if(!element){return this;}
                [].forEach.call(element, function(el) {
                    el.textContent = str;
                });
                return this;
            },
            remove : function(){
                if(!element){return this;}
                [].forEach.call(element, function(el) {
                    el.parentNode.removeChild(el);
                })
                return this;
            },
            ready : function(fn){
                if (document.readyState != 'loading'){
                    fn();
                } else {
                    document.addEventListener('DOMContentLoaded', fn);
                }
            }
        }

        element = myDOM.get(_element);
        return myDOM;
    }

    /*
    * Common request ajax wrapper
    */
    var _request = function(method, endpoint, callback, body, _opts, signedRequest){
        if(!xhr){
            xhr = new XMLHttpRequest();
        }
        if ('withCredentials' in xhr) {
            xhr.open(method, endpoint, true);
            if(!signedRequest){
                xhr.setRequestHeader("Authorization", settings.auth_token);
                xhr.setRequestHeader('Content-Type', 'application/json');
            }

            xhr.onreadystatechange = function(){
                if (this.readyState===4 && (this.status===200 || this.status===204)) {
                    var data = this.responseText;
                    authorized=true;
                    callback(data);
                } else {
                    // We reached our target server, but it returned an error
                    switch(this.status){
                        case 401:
                            window.location.reload();
                            break;
                        case 403:
                            settings.endLoading();
                            authorized=false;
                            settings.message(settings.messages.notAuthMsg); 
                            xhr.abort();
                            break;
                        //default:
                            //console.log(this.status)
                    }
                }
            };
            xhr.send(body);
        }
    }

    /*
    * Create a folder in route
    */
    var _createFolderInput = function(){
        var folder = prompt(settings.folder_prompt, settings.folder_value);
        settings.loading();
        if(folder){
            uploadData(new File([""], ""),folder+"/",function(){
                _getKeys("", true);
            });
        }else{
            settings.endLoading();
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
        data = JSON.parse(data);
        _$(settings.browser_selector).empty();
        _$(settings.browser_selector).append("<table id='"+settings.browser_selector.slice(1)+"-toc'></table>");
        
        var keyRoot = settings.key_root || ""; //to remove from prefixes and contents due our interaction with our lambdas (and security--> root=user email)
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
                breadcrumbs_items.push((i<(z-2)?" <a href='#' onclick='ftps3().getKeys(\""+breadcrumbs_path.join("/")+"\")'>":"")+breadcrumbs[i]+(i<(z-2)?"</a>":""));
            }
            _$(settings.browser_selector+"-toc").append("<tr><td class='ftps3-path' colspan='2'><a href='#' onclick='ftps3().getKeys(\"/\")'><i class='fa fa-home'></i></a> <i class='fa fa-angle-right'></i> "+breadcrumbs_items.join(" <i class='fa fa-angle-right'></i> ")+"</td></tr>");
        }else{
            _$(settings.browser_selector+"-toc").append("<tr><td class='ftps3-path' colspan='2'><i class='fa fa-home'></i></td></tr>");
        }

        if(!isRoot){
            _$(settings.browser_selector+"-toc").append("<tr><td class='ftps3-parent-folder' colspan='2'><i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='ftps3().getKeys(\""+parent+"\")'>..</a></td></tr>");
        }

        var currentPath = "";
        for(var i=0,z=data.CommonPrefixes.length;i<z;i++){
            aux = data.CommonPrefixes[i].Prefix.replace(data.Prefix,"");
            if(aux.slice(-1)==="/"){
                aux = aux.slice(0,aux.length-1);
            }
            currentPath = data.CommonPrefixes[i].Prefix.replace(keyRoot+"/","");
            _$(settings.browser_selector+"-toc").append("<tr class='ftps3-item-folder'><td colspan='2'><input type='checkbox' value='"+currentPath+"' class='ftps3-action' /> <i class='fa fa-folder' aria-hidden='true'></i> <a href='#' onclick='ftps3().getKeys(\""+settings.currentDir+aux+"\")'>" + aux + "</a></td></tr>");
        }

        for(var i=0,z=data.Contents.length;i<z;i++){
            aux = data.Contents[i].Key.slice(data.Contents[i].Key.lastIndexOf("/")+1);
            if(aux!==""){
                _$(settings.browser_selector+"-toc").append("<tr class='ftps3-item-file'><td class='ftps3-item-filename'><input type='checkbox' class='ftps3-action' value='"+data.Contents[i].Key.replace(keyRoot+"/","") + "'/> <i class='fa fa-file' aria-hidden='true'></i> " + aux + "</td><td class='ftps3-item-filesize'>"+ _bytesToSize(data.Contents[i].Size) +"</td><td class='ftps3-item-date'>"+_getDate(data.Contents[i].LastModified)+"</td></tr>");
            }
        }    
    }

    /* 
    * Upload management interface
    * A drop zone is observed and you can drop or click (files or directories) that are uploaded automatically to S3
    */
    var _setUpload = function(){
        // creates input file type
        _$(settings.uploadarea_selector).insertBefore('<label class="ftps3_uploadinput ftps3_uploadinputfile" for="ftps3_uploadfile" style="display:none" >Upload file/s<input type="file" name="file" id="ftps3_uploadfile" multiple style="display:none" /></label>');
        _$(settings.uploadarea_selector).insertBefore('<label class="ftps3_uploadinput ftps3_uploadinputfolder" for="ftps3_uploadfolder" style="display:none" >Upload folder/s<input type="file" name="file" id="ftps3_uploadfolder" webkitdirectory multiple style="display:none" /></label>');

        // preventing page from redirecting
        _$("html").on("dragover", function(e) {
            e.preventDefault();
            e.stopPropagation();
            _$(settings.uploadarea_message_selector).text(settings.messages.dragover_html);
        });

        _$("html").on("drop", function(e) { e.preventDefault(); e.stopPropagation(); });

        // Drag enter
        _$(settings.uploadarea_selector).on('dragenter', function (e) {
            e.stopPropagation();
            e.preventDefault();
            _$(settings.uploadarea_message_selector).text(settings.messages.dragenter);
        });

        // Drag over
        _$(settings.uploadarea_selector).on('dragover', function (e) {
            e.stopPropagation();
            e.preventDefault();
            _$(settings.uploadarea_message_selector).text(settings.messages.dragover_uploadarea);
        });

        // Drop
        _$(settings.uploadarea_selector).on('drop', function (e) {
            e.stopPropagation();
            e.preventDefault();
            _$(settings.uploadarea_message_selector).text(settings.messages.ondrop);
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
        _$(settings.uploadarea_selector).on("click",function(){
            document.getElementById("ftps3_uploadfile").click();
        });


        // Aux function
        var processFilesFolders = function(items){
            for (var i=0; i<items.length; i++) {
                uploadqueue.push([items[i], items[i].webkitRelativePath.replace(items[i].name,"")]);
            } 
            uploadqueue.process(1);
        }

        // file selected
        _$("#ftps3_uploadfile").on("change", function(){
            settings.loading();
            processFilesFolders(document.querySelector('#ftps3_uploadfile').files);
        });

        // folder selected
        _$("#ftps3_uploadfolder").on("change", function(){
            settings.loading();
            processFilesFolders(document.querySelector('#ftps3_uploadfolder').files);
        });
    }

    /* 
    * process items in queue[]
    */
    var _processUploadQueue = function() {
        var item = uploadqueue.getItem();
        if(!item){
            uploadqueue.queuesLength(true);
            _$(settings.uploadarea_message_selector).text(settings.messages.dragarea);
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
        _request("GET", settings.endpoint_signedform, function(data){
            settings.signedFormData = JSON.parse(data);
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
            .replace(/~/g,"-")
            .replace(/\s/g,"-")
            .replace(/[\(\)\[\]]/g,"-")
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
            _$(settings.logarea_selector).prepend("<p><span class='ftps3-action-log-"+cleanName(file.name)+"'>Uploading </span> " + path + file.name + "</p>");
        }
        _fnUpload(fd, cb);
    }

    /*
    * Ajax function to upload form data signed
    */
    var _ajaxUploadPost = function(formdata, cb){
        _$(settings.uploadarea_message_selector).text(settings.messages.onuploading);
        _request("POST", settings.signedFormData.endpoint, function(response){
            if(settings.logarea_selector){
                try{
                    _$(".ftps3-action-log-"+cleanName(formdata.get("file").name)).html("Uploaded");
                }catch(e){}
            }
            _$(settings.uploadarea_message_selector).text(settings.messages.onfinish);
            if(typeof cb==="function"){cb();}
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
    * Gets all keys checked (input.ftps3-action:checked) and sends to lambda backend. 
    * POST better than DELETE because we need send body
    */
    var _deleteKeys = function(keys){
        if(!keys){return;}
        _request("POST", settings.endpoint_delete, function(data){
            data = JSON.parse(data);
            if(data.message==="done"){
                _$(".ftps3-action-log-item").html("Deleted");
                _getKeys(settings.currentDir);
            }
        }, JSON.stringify({"keys" : keys}));
    }

    /*
    * Get all files to delete from interface
    */
    var _deleteSelected = function(){
        var message=settings.messages.ondelete;
        if(_$(settings.browser_selector + " input.ftps3-action:checked").size()>0 && window.confirm(message)){
            settings.loading(); 
            var keys = [];
            _$(settings.browser_selector + " input.ftps3-action:checked").each(function(item){
                keys.push(item.value);
                if(settings.logarea_selector){
                    _$(settings.logarea_selector).prepend("<p><span class='ftps3-action-log-item'>Deleting</span> " + item.value + "</p>");
                }

            });
            _deleteKeys(keys)
        }
    }

    /*
    * Get all files to download from interface
    */
   var _downloadSelected = function(){
    if(_$(settings.browser_selector + " input.ftps3-action:checked").size()>0){
        settings.loading(); 
        var keys = [];
        _$(settings.browser_selector + " input.ftps3-action:checked").each(function(item){
            //Check not directory
            if(!item.value.endsWith("/")) {
                keys.push(item.value);
                if(settings.logarea_selector){
                    _$(settings.logarea_selector).prepend("<p><span class='ftps3-action-log-item'>Downloading</span> " + item.value + "</p>");
                }
            }
            else {
                settings.endLoading(); 
                console.warn("Evicting directory " + item.value);
            }
        });
        _getFiles(keys);
    }
   }

    /* 
    * Download management. 
    * Gets all keys checked (input.ftps3-action:checked) and sends to lambda backend. 
    * POST better than GET because we need send body
    */
   var _getFiles = function(keys){
        if(!keys){return;}

        _request("POST", settings.endpoint_getpresignedurls, function(data){
            data = JSON.parse(data);

            if(data.urls){
                var numDownloadedFiles = 0;
                data.urls.forEach(function(entry, i) {

                    fetch(entry, {method: 'GET'})
                        .then(res => {
                            return res.blob();
                        })
                        .then(blob => {
                            var url = window.URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url;
                            a.download = keys[i];
                            document.body.appendChild(a); 
                            a.click();  
                            setTimeout(
                            _ => { window.URL.revokeObjectURL(url); }, 
                            60000); 
                            a.remove();

                            _$(".ftps3-action-log-item").html("Downloaded");
                                
                            numDownloadedFiles++;
                            if(numDownloadedFiles == keys.length) {
                                settings.endLoading();
                            }
                        })
                        .catch(err => {
                            console.error('err: ', err);
                    })            
                });
            }
        }, JSON.stringify({"keys" : keys}));
    }

}(window));
