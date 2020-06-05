'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const utils = require('../utils');

async function deleteFromS3(bucket, path) {
  const listParams = {
    Bucket: bucket,
    Prefix: path
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
  const check = utils.checkAuth(event, "delete");

  if(check.error){
    return utils.getResponse(check.error, null, 403);
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

  await Promise.all(keys.map(async(key) => {
      const newKey = utils.adaptKey(event, key, check.user);
      if(newKey){
        await deleteFromS3(check.bucket, newKey);
      }
  }));

  return utils.getResponse(null, "{\"message\" : \"done\"}");
    
};
