/**
 * Generate an Access Token for Twilio Conversations
 * 
 * This function generates a JWT token that authenticates a client to use Twilio Conversations.
 */

const AccessToken = require('twilio').jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  
  // Allow CORS
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    // Get the user's identity from the request
    const { identity } = event;
    
    if (!identity) {
      response.setStatusCode(400);
      response.setBody({ error: 'Identity is required' });
      return callback(null, response);
    }
    
    console.log('Generating token for identity:', identity);
    console.log('Using Twilio Account SID:', context.TWILIO_ACCOUNT_SID);
    console.log('Using API Key SID:', context.API_KEY);
    console.log('Using Conversations Service SID:', context.CONVERSATIONS_SERVICE_SID);
    
    // Create an access token with the correct parameter structure
    const accessToken = new AccessToken(
      context.TWILIO_ACCOUNT_SID,
      context.API_KEY,
      context.API_SECRET
    );
    
    // Set the identity on the token
    accessToken.identity = identity;
    
    // Create a Chat Grant and add it to the token
    const chatGrant = new ChatGrant({
      serviceSid: context.CONVERSATIONS_SERVICE_SID
    });
    
    accessToken.addGrant(chatGrant);
    
    // Return the token
    response.setStatusCode(200);
    response.setBody({
      token: accessToken.toJwt(),
      identity: identity
    });
    
    console.log('Token generated successfully for identity:', identity);
    return callback(null, response);
  } catch (error) {
    console.error('Error generating access token:', error);
    response.setStatusCode(500);
    response.setBody({ error: error.message });
    return callback(null, response);
  }
}; 