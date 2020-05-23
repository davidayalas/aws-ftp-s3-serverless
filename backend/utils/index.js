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
