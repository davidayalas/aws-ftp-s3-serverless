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

Create file "js/endpoints.js" with the following content replacing values with aproppiate:

```javascript
var LoginDomain = "https://xxxxxxxx.execute-api.eu-west-1.amazonaws.com";
var LoginPath = "/pro/getJWT";
var FTP_endpoint = "https://xxxxxxxx.execute-api.eu-west-1.amazonaws.com";
```

# TODO

* Serverless template to deploy it easy
