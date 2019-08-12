'use strict';
console.log('poc-ftp-serverless-delete');

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

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
    
    await Promise.all(keys.map(async (key) => {
        await deleteFromS3(options.bucket, key);
      }));
    
    return { 
        "statusCode": 200,
        "headers" : {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Credentials' : true,
            'Access-Control-Allow-Methods' : '*'
        }
    };

    async function deleteFromS3(bucket, path) {
        var prefix = user + '/' + path;
        console.log("DELETE FROM S3: " + prefix);
          const listParams = {
            Bucket: bucket,
            Prefix: prefix
          };
        
          const listedObjects = await s3.listObjectsV2(listParams).promise();
          console.log("listedObjects", listedObjects);
          if (listedObjects.Contents.length === 0) return;
        
          const deleteParams = {
            Bucket: bucket,
            Delete: { Objects: [] }
          };
        
          listedObjects.Contents.forEach(({ Key }) => {
            deleteParams.Delete.Objects.push({ Key });
          });
          console.log("deleteParams", deleteParams);
        
          const deleteResult = await s3.deleteObjects(deleteParams).promise();
          console.log("deleteResult", deleteResult);
          if (listedObjects.IsTruncated && deleteResult)
            await deleteFromS3(bucket, path);
      }
    
};
