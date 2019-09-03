# PoC AWS FTP S3 Serverless

The goal of this project is to provide a space for users under a AWS S3 bucket (shared S3 bucket with a "folder" for every user), with a web interface to upload, browse, download and remove files.

Features:

* Each user only sees its "folder" under S3 bucket. The folder is its "id" from OAuth or SAML
    - In our PoC, it works with SAML-JWT deployed as a lambda (https://github.com/davidayalas/saml-jwt)
    - You need a Custom Authorizer for your API Gateway to validate JWT Token. Sample here: https://yos.io/2017/09/03/serverless-authentication-with-jwt/

* User can upload folders (drag and drop) and the structure is recreated in S3

* Files can be downloaded (not directories)

* Folders can be deleted (included not empty)

* Folder creation

## Sample interface

![screen](docs/screen-1.png)
![screen while uploading](docs/screen-2.png)

## Lambdas

1. Form signing for upload > [lambda/form-signing/index.js](lambda/form-signing/index.js) This lambda generates the signature for valid uploads. 

1. Browsing > [lambda/browsing/index.js](lambda/browsing/index.js) This lambda retrieves the objects in a path

1. Delete > [lambda/delete-keys/index.js](lambda/delete-keys/index.js) This lambda deletes recursively all objects in a path

1. Get presigned urls > [lambda/get-presigned-urls/index.js](lambda/get-presigned-urls/index.js) This lambda generate presigned urls for objects to be downloaded safely

## API GW 

* These lambdas have to be exposed througth AWS API GW. 
* The custom authorizer has to include a {user : "id"} in the request context in order to get it in the previous lambdas to target the user folder: event.requestContext.authorizer.user
* Enable CORS: https://serverless.com/blog/cors-api-gateway-survival-guide/
* Remember the "Gateway responses" then custom authorizer in use.


## Setup interface

Include [js/ftps3.js](js/ftps3.js) in your html.

    ftps3({
        endpoint_signedform : "your lambda or endpoint",
        endpoint_browse : "your lambda or endpoint",
        endpoint_delete : "your lambda or endpoint",
        endpoint_getpresignedurls : "your lambda or endpoint",
        auth_token : "auth token to validate againt api gw custom authorizer",
        key_root : "in a bucket shared for some users, 'user key'",
        
        browser_selector: "#browser"
        uploadarea_selector: "#upload-area",
        uploadarea_message_selector: "#upload-area-message",
        logarea_selector : "#log-area",
        max_upload_threads : 10, //to process internal queue quickly
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
    });

    ftps3().getKeys();
    ftps3().setUpload();


# TODO

* Serverless template to deploy it easy
