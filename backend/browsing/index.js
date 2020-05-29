'use strict';

const AWS = require('aws-sdk');
AWS.config.region = process.env.AWS_REGION || 'eu-west-1';
AWS.config.signatureVersion = 'v4';

const s3 = new AWS.S3();
const utils = require('../utils');

const _BUCKET = process.env.BUCKET;

exports.handler = async (event, context) => {
    let user = null;
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        user = event.requestContext.authorizer.user;
    }
    if(!user){
       return utils.getResponse("no user, no live", null, 403);
    }
    
    let path = '';
    if(event.queryStringParameters && event.queryStringParameters.path) {
        path += event.queryStringParameters.path + '/';
    }

    await utils.setCredentials(AWS, process.env.ROLE);

    const params = {
        Bucket: _BUCKET,
        Delimiter: '/',
        Prefix: user + '/' + path
    };

    if(event.queryStringParameters && event.queryStringParameters.continuationToken) {
        params.NextContinuationToken = event.queryStringParameters.continuationToken;
    }

    const data = await s3.listObjectsV2(params).promise();
    
    return utils.getResponse(null, JSON.stringify(data));
};
