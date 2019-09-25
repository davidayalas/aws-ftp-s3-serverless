'use strict';
console.log('poc-ftp-serverless-sigv4-post-form');

var SHA256 = require("crypto-js/hmac-sha256");

var AWS = require('aws-sdk');
AWS.config.region = process.env.AWS_REGION || 'eu-west-1';
AWS.config.signatureVersion = 'v4';

var sts = new AWS.STS();

//arn:aws:iam::481873728264:role/poc-ftp-serverless

var options = {
    region : process.env.AWS_REGION || 'eu-west-1',
    key : process.env.AWS_KEYID,
    secret : process.env.AWS_SECRET,
    bucket : process.env.AWS_BUCKET
}


async function setCredentials(){
    return new Promise((resolve, reject) => {
        let role_promise = sts.assumeRole({
          RoleArn: 'arn:aws:iam::481873728264:role/poc-ftp-serverless',
          RoleSessionName: 'pocftpserverless'
        }).promise().then(function(data){
            AWS.config.accessKeyId = data.Credentials.AccessKeyId;
            AWS.config.secretAccessKey = data.Credentials.SecretAccessKey;
            AWS.config.sessionToken = data.Credentials.SessionToken;
            resolve(data.Credentials);
        }).catch((err) => {
            console.log(err, err.stack);
            reject(err);
        })
    })
}
 

exports.handler = async (event, context) => {
    let user = null;
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        user = JSON.parse(event.requestContext.authorizer.user);
    }   

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
    
    await setCredentials();
    
    var currentDate = new Date();
    var expiresMinutes = 120
    var expires = new Date(currentDate.getTime()+(60000*expiresMinutes));

    var params = {
        Bucket: options.bucket,
        Conditions: [
     	   ["starts-with", "$key", user + "/"],
 	       {"bucket": options.bucket},
        ]
    };
    
    var s3 = new AWS.S3();
    
    return new Promise((resolve, reject) => {
        s3.createPresignedPost(params, function(err, data) {
          if (err) {
            console.error('Presigning post data encountered an error', err);
          } else {
            var formdata = {};
            formdata.endpoint = data.url;
            formdata.key = user + '/${filename}';
            for(var k in data.fields){
                formdata[k] = data.fields[k];
            }
            resolve({
                "statusCode": 200,
                "body" : JSON.stringify(formdata),
                "headers" : {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin' : '*',
                    'Access-Control-Allow-Credentials' : true,
                    'Access-Control-Allow-Methods' : '*'
                }   
            })
          }
        });    
    })
}
