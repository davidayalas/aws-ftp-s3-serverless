const jwt = require('jsonwebtoken');

const auth_users = process.env.AUTH_USERS ? process.env.AUTH_USERS.split(",") : [];

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

function isAllowed(user){
  return auth_users.includes(user) ? "Allow" : "Deny";
}
  
/**
  * Authorizer functions are executed before your actual functions.
  * @method authorize
  * @param {String} event.authorizationToken - JWT
  * @throws Returns 401 if the token is invalid or has expired.
  * @throws Returns 403 if the token does not have sufficient permissions.
  */
module.exports.handler = (event, context, callback) => {
  const token = event.authorizationToken;
  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = decoded.nameID;
    // Checks if the user's scopes allow her to call the current function
    //const isAllowed = authorizeUser([]], event.methodArn);

    const effect = isAllowed(user);
    const userId = user.nameID;
    const authorizerContext = { user: JSON.stringify(user) };
    // Return an IAM policy document for the current endpoint
    const policyDocument = buildIAMPolicy(userId, effect, event.methodArn, authorizerContext);

    callback(null, policyDocument);
  } catch (e) {
    callback('Unauthorized'); // Return a 401 Unauthorized response
  }
}; 