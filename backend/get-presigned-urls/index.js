'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const utils = require('../utils');

const _BUCKET = process.env.BUCKET;

exports.handler = async (event, context) => {
    const check = utils.checkAuth(event);

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
   
    let urls = [];
    const signedUrlExpireSeconds = 60 * 5;
    
    for(let key of keys) {
        //var val = user + '/' + key;
        let val = utils.adaptKey(event, key, check.user);        

        const url = s3.getSignedUrl('getObject', {
            Bucket: _BUCKET,
            Key: val,
            Expires: signedUrlExpireSeconds
        });
        
        urls.push(url);
    }
    
    var bodyContent = "{\"urls\":" + JSON.stringify(urls) + "}";
    
    return utils.getResponse(null, bodyContent);
};
