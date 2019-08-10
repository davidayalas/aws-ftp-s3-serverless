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

    if(!user){
       return "no user, no live";
    }

    const params = {
        Bucket: options.bucket,
        Delimiter: '/',
        Prefix: user + '/'
    };

    const data = await s3.listObjects(params).promise();
    
    var files = []
    data.Contents.forEach((elem) => {
      console.log(elem.Key);
      var key = elem.Key;
      var lastModified = elem.LastModified;
      var size = elem.Size;
      files.push({ key, lastModified, size  });
    });
    
    return { 
        "statusCode": 200,
        "body" : JSON.stringify(files),
        "headers" : {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Credentials' : true,
            'Access-Control-Allow-Methods' : '*'
        }
    }
};
