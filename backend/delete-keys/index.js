'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const utils = require('../utils');

const _BUCKET = process.env.BUCKET;

async function deleteFromS3(bucket, path, user) {
  const prefix = user + '/' + path;
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


exports.handler = async (event, context) => {
    let user = null;
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        user = JSON.parse(event.requestContext.authorizer.user);
    }
    
    if(!user){
      return utils.getResponse("no user, no live", null, 403);
    }
    
    let keys = null;

    if (event.body !== null && event.body !== undefined) {
      let body = JSON.parse(event.body);
      if (body.keys){ 
          keys = body.keys;
      }
    }
    
    if(!keys) {
      return utils.getResponse("no keys", null, 400);
    }

    await utils.setCredentials(AWS, process.env.ROLE);

    await Promise.all(keys.map(async (key) => {
        await deleteFromS3(_BUCKET, key, user);
    }));

    return utils.getResponse(null, "{\"message\" : \"done\"}");
    
};
