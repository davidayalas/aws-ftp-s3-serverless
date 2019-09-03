'use strict';
console.log('poc-ftp-serverless-getpresignedurls');

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
AWS.config.update({accessKeyId: 'id-omitted', secretAccessKey: 'key-omitted'})

var options = {
    region : process.env.AWS_REGION || 'eu-west-1',
    key : process.env.AWS_KEYID,
    secret : process.env.AWS_SECRET,
    bucket : process.env.AWS_BUCKET
};

exports.handler = async (event, context) => {
    let user = null;
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        user = JSON.parse(event.requestContext.authorizer.user);
    }
    console.log(event.requestContext);
    if(!user){
       return { 
        "statusCode": 403,
        "message": "no user, no live",
        "headers" : {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Credentials' : true,
            'Access-Control-Allow-Methods' : '*'
        }
       };
    }
    
    let keys = null;

    if (event.body !== null && event.body !== undefined) {
        console.log("BODY: " + event.body);
        let body = JSON.parse(event.body);
        if (body.keys) 
            keys = body.keys;
    }
    
    if(!keys) {
        return { 
            "statusCode": 400,
            "message": "no keys, no live",
            "headers" : {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin' : '*',
                'Access-Control-Allow-Credentials' : true,
                'Access-Control-Allow-Methods' : '*'
            }
        };
    }

    console.log("KEYS: " + keys);
    
    var urls = [];
    const signedUrlExpireSeconds = 60 * 5;
    
    for(let key of keys) {
        var val = user + '/' + key;
        
        const url = s3.getSignedUrl('getObject', {
            Bucket: options.bucket,
            Key: val,
            Expires: signedUrlExpireSeconds
        })
        
        console.log("URL: " + url);
        urls.push(url);
    }
    
    var bodyContent = "{\"urls\":" + JSON.stringify(urls) + "}";
    
    console.log("BODY CONTENT: " + bodyContent);
    
    return { 
        "statusCode": 200,
        "body": bodyContent,
        "headers" : {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Credentials' : true,
            'Access-Control-Allow-Methods' : '*'
        }
    };

};
