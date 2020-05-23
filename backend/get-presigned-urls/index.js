'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const utils = require('../utils');

const _BUCKET = process.env.BUCKET;

exports.handler = async (event, context) => {
    let user = null;
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        user = JSON.parse(event.requestContext.authorizer.user);
    }
    console.log(event.requestContext);
    if(!user){
        return utils.getResponse("no user, no live", null, 403);
    }
    
    let keys = null;

    if (event.body !== null && event.body !== undefined) {
        console.log("BODY: " + event.body);
        let body = JSON.parse(event.body);
        if (body.keys) 
            keys = body.keys;
    }
    
    if(!keys) {
        return utils.getResponse("no keys", null, 400);
    }

    await utils.setCredentials(AWS, process.env.ROLE);
   
    var urls = [];
    const signedUrlExpireSeconds = 60 * 5;
    
    for(let key of keys) {
        var val = user + '/' + key;
        
        const url = s3.getSignedUrl('getObject', {
            Bucket: _BUCKET,
            Key: val,
            Expires: signedUrlExpireSeconds
        })
        
        console.log("URL: " + url);
        urls.push(url);
    }
    
    var bodyContent = "{\"urls\":" + JSON.stringify(urls) + "}";
    
    console.log("BODY CONTENT: " + bodyContent);
    
    return utils.getResponse(null, bodyContent);
};
