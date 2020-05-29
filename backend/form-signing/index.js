'use strict';

var SHA256 = require("crypto-js/hmac-sha256");

var options = {
    region : process.env.AWS_REGION || 'eu-west-1',
    key : process.env.AWS_KEYID,
    secret : process.env.AWS_SECRET,
    bucket : process.env.BUCKET
}

exports.handler = async (event, context) => {
    
    let user = null;
    if(event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.user){
        user = event.requestContext.authorizer.user;
    }   

    if(!user){
        return event;
    }


    function getSignatureKey(dateStamp) {
 	   var kDate = SHA256(dateStamp, "AWS4" + options.secret);
 	   var kRegion = SHA256(options.region, kDate);
 	   var kService = SHA256("s3", kRegion);
 	   var kSigning = SHA256("aws4_request", kService);
 	   return kSigning;
    }

    var currentDate = new Date();
    var expiresMinutes = 120;
    var expires = new Date(currentDate.getTime()+(60000*expiresMinutes));
    var signingDate = currentDate.getFullYear() + ('0' + (currentDate.getMonth()+1)).slice(-2) + ('0' + (currentDate.getDate())).slice(-2);
    var signingkey = getSignatureKey(signingDate);
    var success_redirect = event.queryStringParameters && event.queryStringParameters.success_redirect ? event.queryStringParameters.success_redirect : "";            

    var xamzcredential = options.key + "/" + signingDate + "/" + options.region + "/s3/aws4_request";
    signingDate = signingDate + 'T000000Z';

    var s3Policy = {
    "expiration": expires.toISOString(),
    "conditions": [
 	   ["starts-with", "$key", user + "/"],
 	   {"bucket": options.bucket},
 	   {"acl": "private"},
 	   {"success_action_redirect": success_redirect},
 	   {"x-amz-server-side-encryption": "AES256"},
 	   {"x-amz-credential": xamzcredential},
 	   {"x-amz-algorithm": "AWS4-HMAC-SHA256"},
 	   {"x-amz-date": signingDate}    ]
    };

    var policy64 = new Buffer(JSON.stringify(s3Policy), "utf-8").toString('base64');
    var signature = SHA256(policy64, signingkey);
    
    return { 
        "statusCode": 200,
        "body" : JSON.stringify({
            'endpoint' : "https://s3-" + options.region + ".amazonaws.com/" + options.bucket + "/",
            'key' : user + '/${filename}',
            'acl' : 'private',
            'success_action_redirect' : success_redirect,
            'x-amz-server-side-encryption' : 'AES256',
            'x-amz-credential' : xamzcredential,
            'x-amz-algorithm' : 'AWS4-HMAC-SHA256',
            'x-amz-date' : signingDate,
            'Policy' : policy64,
            'x-amz-signature' : signature.toString()
            }
        ),
        "headers" : {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Credentials' : true,
            'Access-Control-Allow-Methods' : '*'
        }   
    }

};
