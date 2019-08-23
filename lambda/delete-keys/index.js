'use strict';

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
      let body = JSON.parse(event.body);
      if (body.keys){ 
          keys = body.keys;
      }
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
        const listParams = {
          Bucket: bucket,
          Prefix: prefix
        };
      
        const listedObjects = await s3.listObjectsV2(listParams).promise();
        if (listedObjects.Contents.length === 0) return;
      
        const deleteParams = {
          Bucket: bucket,
          Delete: { Objects: [] }
        };
      
        listedObjects.Contents.forEach(({ Key }) => {
          deleteParams.Delete.Objects.push({ Key });
        });
      
        const deleteResult = await s3.deleteObjects(deleteParams).promise();

        if (listedObjects.IsTruncated && deleteResult){
          await deleteFromS3(bucket, path);
        }
      }
    
};
