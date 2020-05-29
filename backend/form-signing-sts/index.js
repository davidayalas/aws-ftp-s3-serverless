'use strict';

const AWS = require('aws-sdk');
const utils = require('../utils');

AWS.config.region = process.env.AWS_REGION || 'eu-west-1';
AWS.config.signatureVersion = 'v4';

const _BUCKET = process.env.BUCKET;
 
exports.handler = async (event, context) => {

    if(!_BUCKET){
        return utils.getResponse("no bucket", null, 500);
    }

    let user = null;
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        user = event.requestContext.authorizer.user;
    }   

    if(!user){
        return utils.getResponse("no user, no live", null, 403);
    }
    
    await utils.setCredentials(AWS, process.env.ROLE);
    
    const currentDate = new Date();
    const expiresMinutes = 120
    const expires = new Date(currentDate.getTime()+(60000*expiresMinutes));

    const params = {
        Bucket: _BUCKET,
        Conditions: [
     	   ["starts-with", "$key", user + "/"],
 	       {"bucket": _BUCKET},
        ],
        Expiration: expires.toISOString()
    };
    
    const s3 = new AWS.S3();
    
    return new Promise((resolve, reject) => {
        s3.createPresignedPost(params, function(err, data) {
          if (err) {
            console.error('Presigning post data encountered an error', err);
          } else {
            let formdata = {};
            formdata.endpoint = data.url;
            formdata.key = user + '/${filename}';
            for(let k in data.fields){
                formdata[k] = data.fields[k];
            }
            resolve(utils.getResponse(null, JSON.stringify(formdata)));
          }
        });    
    })
}
