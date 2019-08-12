'use strict';
console.log('poc-ftp-serverless-browser');

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

var options = {
    region : process.env.AWS_REGION || 'eu-west-1',
    key : process.env.AWS_KEYID,
    secret : process.env.AWS_SECRET,
    bucket : process.env.AWS_BUCKET
}

exports.handler = async (event, context) => {
    let user = null;
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        user = JSON.parse(event.requestContext.authorizer.user);
    }
    console.log(event.requestContext)
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
    
    let path = '';
    if(event.queryStringParameters && event.queryStringParameters.path) {
        path += event.queryStringParameters.path + '/';
    }

    const params = {
        Bucket: options.bucket,
        Delimiter: '/',
        Prefix: user + '/' + path
    };

    if(event.queryStringParameters && event.queryStringParameters.continuationToken) {
        params.NextContinuationToken = event.queryStringParameters.continuationToken;
    }

    const data = await s3.listObjectsV2(params).promise();
    
    return { 
        "statusCode": 200,
        "body" : JSON.stringify(data),
        "headers" : {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Credentials' : true,
            'Access-Control-Allow-Methods' : '*'
        }
    }
};
