let sts = null;

exports.setCredentials = async (_AWS, role) => {
    
    if(!sts){
        sts = new _AWS.STS();
    }
    
    return new Promise((resolve, reject) => {
        sts.assumeRole({
            RoleArn: role,
            RoleSessionName: 'ftp-serverless'
        }).promise().then(function(data){
            _AWS.config.accessKeyId = data.Credentials.AccessKeyId;
            _AWS.config.secretAccessKey = data.Credentials.SecretAccessKey;
            _AWS.config.sessionToken = data.Credentials.SessionToken;
            resolve(data.Credentials);
        }).catch((err) => {
            console.log(err, err.stack);
            reject(err);
        });
    });
};

exports.getResponse = (err, data, status) => {

    let response = { 
        "statusCode": status || 200,
        ...err && !data && {"body": `{"error":"${err}"}`},
        ...!err && data && {"body": `${data}`},
        "headers" : {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : process.env.ORIGIN || '*',
            'Access-Control-Allow-Credentials' : true,
            'Access-Control-Allow-Methods' : '*'
        }
    };    

    return response;
}

const getBucket = (path) => {
    return path ? path.split("/")[0] : null;
}

const getPath = (event) => {
    if(event.queryStringParameters && event.queryStringParameters.path) {
        return event.queryStringParameters.path;
    }else if (event.body !== null && event.body !== undefined) {
        let body = JSON.parse(event.body);
        if (body.keys){ 
            return body.keys[0];
        }
    }
    return "";
}

const getUser = (event) => {
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        return event.requestContext.authorizer.user;
    }
    return null;
}

const _trimSlash = (_str) => {
    if(_str){
        _str = _str.replace(/^\/+|\/+$/g, '');
    }
    return _str;
}

exports.trimSlash = _trimSlash;

const _removeDoubleSlash = (_str) => {
    if(_str){
        _str = _str.replace(/\/+/g, '/');
    }
    return _str;
}

exports.removeDoubleSlash = _removeDoubleSlash;


const isAdmin = (permissions, folder) => {
    let bucketAdmin = false;
    for(let i=0, z=permissions.length; i<z; i++){
        if(permissions[i].folder===folder && permissions[i].role==="admin"){
            bucketAdmin = true;
        }
    }
    return bucketAdmin;
}

exports.checkAuth = function(event, action){

    let user = getUser(event);

    if(!user){
        return {"error" : "no user, no live"};
    }

    let path = getPath(event);

    let permissions = event.requestContext.authorizer.permissions; //{bucket : [{folder,role}]

    try{
        permissions = JSON.parse(permissions);
    }catch(e){
        return {"error" : "no permissions"};
    }

    let buckets = Object.keys(permissions);

    if(path===''){ //return available buckets
        return {
            data : {
                CommonPrefixes : buckets.map(function(i){return {Prefix: i + "/"}}),
                Contents : [],
                Prefix : "",
                Name : ""
            }
        }
    }else if(buckets.indexOf(path)>-1){ //bucket directly. It could be "admin" of that bucket... then 
        if(isAdmin(permissions[path],"")){
            return {
                "bucket" : path,
                "key" : "",
                "user" : ""
            }
        }else{
            return {
                data : {
                    CommonPrefixes : permissions[path].map(function(i){return i.folder ? {Prefix: i.folder + "/"} : {Prefix : ""}}),
                    Contents : [],
                    Prefix : "",
                    Name : path 
                }
            }
        }
    }else{
        path = path.split("/");
        let requestedPath = path.slice(1).join("/");
        requestedPath = _removeDoubleSlash(_trimSlash(requestedPath));
        let isAuth = false;
        if(!permissions[path[0]]){
            return {"error" : "wrong bucket"};
        }
        permissions[path[0]].map(function(i){
            i.folder = _removeDoubleSlash(_trimSlash(i.folder));
            if(i.folder===requestedPath && i.role==="user" && action==="delete"){
                isAuth = false;
            }else if(i.folder===requestedPath || requestedPath.indexOf(i.folder)===0){
                isAuth = true;
                if(i.role==="user"){
                    requestedPath = requestedPath.split(i.folder).join(i.folder+"/"+user);
                } 
            }
        });
        console.log("isAdmin ", isAdmin(permissions[path[0]],requestedPath), " ", permissions[path[0]], " ", requestedPath)
        return {
            ...isAuth && {"bucket" : path[0]},
            ...isAuth && {"key" : requestedPath},
            ...isAuth && {"user" : isAdmin(permissions[path[0]],requestedPath) ? "" : user},
            ...!isAuth && {"error" : "not authorized key or user"}
        }
    }
}

exports.adaptKey = function(event, path, user){

    let permissions = event.requestContext.authorizer.permissions; //{bucket : [{folder,role}]

    try{
        permissions = JSON.parse(permissions);
    }catch(e){
        return {"errMessage" : "no permissions"};
    }

    path = path ? path.split("/") : [];
    let requestedPath = path.slice(1).join("/");
    let isAuth = false;
    permissions[path[0]].map(function(i){
        if(i.folder===requestedPath || requestedPath.indexOf(i.folder)===0){
            isAuth = true;
            if(i.role==="user"){
                //requestedPath = requestedPath.split(i.folder).join(i.folder+"/"+user);
                requestedPath = requestedPath.replace(i.folder, i.folder+"/"+user);
            } 
        }
    });
    
    return !isAuth ? null : requestedPath;
}
