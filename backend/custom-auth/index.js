const jwt = require('jsonwebtoken');
const s3select = require("./s3select");

const _BUCKET = process.env.BUCKET || "";
const _FILE = process.env.FILE || "";

const buildIAMPolicy = (userId, effect, resource, context) => {
    const policy = {
      principalId: userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: effect,
            Resource: resource,
          },
        ],
      },
      context,
    };
  
    return policy;
};

async function getPermissions(user){
  if(!_BUCKET || !_FILE){
    return [];
  }

  const permissions = await s3select.query({
    "Bucket" : _BUCKET, 
    "Key": _FILE, 
    "Expression": `select * from s3object s where s.id='${user}'`,
  });
  
  return JSON.parse(permissions);
}
  
/**
  * Authorizer functions are executed before your actual functions.
  * @method authorize
  * @param {String} event.authorizationToken - JWT
  * @throws Returns 401 if the token is invalid or has expired.
  * @throws Returns 403 if the token does not have sufficient permissions.
  */
module.exports.handler = async (event, context, callback) => {
  const token = event.authorizationToken;
  if(!token){
    return ('Unauthorized ', 'No token'); // Return a 401 Unauthorized response
  }
  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = decoded["urn:oid:0.9.2342.19200300.100.1.3"];

    const permissions = await getPermissions(user);
    const effect = permissions.length>0 ? "Allow" : "Deny";
    const authorizerContext = { "user": user, "permissions" : permissions[0][1]};
    const policyDocument = buildIAMPolicy(user, effect, event.methodArn, authorizerContext);

    return (null, policyDocument); 
  } catch (e) {
    return ('Unauthorized ', e.message); // Return a 401 Unauthorized response
  }
}; 