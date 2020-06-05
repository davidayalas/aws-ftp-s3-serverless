'use strict';

const AWS = require('aws-sdk');
const utils = require('../utils');

AWS.config.region = process.env.AWS_REGION || 'eu-west-1';
AWS.config.signatureVersion = 'v4';

exports.handler = async (event, context) => {

    const check = utils.checkAuth(event);

    if(check.error){
       return utils.getResponse(check.error, null, 403);
    }
    
    await utils.setCredentials(AWS, process.env.ROLE);
    
    const currentDate = new Date();
    const expiresMinutes = 120
    const expires = new Date(currentDate.getTime()+(60000*expiresMinutes));

    const params = {
        Bucket: check.bucket,
        Conditions: [
     	   ["starts-with", "$key", check.key],
 	       {"bucket": check.bucket},
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
            formdata.key = (check.key ? check.key + "/" : "") + '${filename}';
            for(let k in data.fields){
                formdata[k] = data.fields[k];
            }
            resolve(utils.getResponse(null, JSON.stringify(formdata)));
          }
        });    
    })
}
