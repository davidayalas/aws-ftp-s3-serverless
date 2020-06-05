'use strict';

const AWS = require('aws-sdk');
AWS.config.region = process.env.AWS_REGION || 'eu-west-1';
AWS.config.signatureVersion = 'v4';

const s3 = new AWS.S3();
const utils = require('../utils');

exports.handler = async (event, context) => {
    const check = utils.checkAuth(event);

    if(check.error){
       return utils.getResponse(check.error, null, 403);
    }
    
    if(check.data){ //home
        return utils.getResponse(null, JSON.stringify(check.data));
    }

    await utils.setCredentials(AWS, process.env.ROLE);

    const params = {
        Bucket: check.bucket,
        Delimiter: '/',
        //Prefix: user + '/' + path
        Prefix: check.key ? check.key + "/" : ""
    };

    if(event.queryStringParameters && event.queryStringParameters.continuationToken) {
        params.NextContinuationToken = event.queryStringParameters.continuationToken;
    }

    const data = await s3.listObjectsV2(params).promise();

    data.originalPrefix = data.Prefix;
    if(check.user){
        for(let i=0,z=data.Contents.length;i<z;i++){
            data.Contents[i].Key = utils.removeDoubleSlash(data.Contents[i].Key.replace(check.user+"/",""));
        }
        for(let i=0,z=data.CommonPrefixes.length;i<z;i++){
            data.CommonPrefixes[i].Prefix = utils.removeDoubleSlash(data.CommonPrefixes[i].Prefix.replace(check.user+"/",""));
        }
        data.Prefix = utils.removeDoubleSlash(data.Prefix.replace(check.user+"/",""));
    }
    
    return utils.getResponse(null, JSON.stringify(data));
};
