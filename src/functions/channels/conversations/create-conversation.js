/**
 * Create or Join a Conversation
 * 
 * This function creates a new conversation or lets a user join an existing one.
 * It's used to establish the connection between the website user and the RFA agent.
 */

const twilio = require('twilio');

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
    
    // Check required environment variables
    if (!context.TWILIO_ACCOUNT_SID || !context.TWILIO_AUTH_TOKEN) {
      console.error('Missing Twilio credentials');
      response.setStatusCode(500);
      response.setBody({ error: 'Twilio credentials are not configured' });
      return callback(null, response);
    }
    
    if (!context.CONVERSATIONS_SERVICE_SID) {
      console.error('Missing Conversations Service SID');
      response.setStatusCode(500);
      response.setBody({ error: 'CONVERSATIONS_SERVICE_SID is not configured' });
      return callback(null, response);
    }
    
    console.log('Creating/joining conversation for identity:', identity);
    console.log('Using Account SID:', context.TWILIO_ACCOUNT_SID);
    console.log('Using Conversations Service SID:', context.CONVERSATIONS_SERVICE_SID);
    
    // Initialize the Twilio client with explicit credentials
    const client = twilio(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);
    
    if (!client) {
      console.error('Twilio client initialization failed');
      response.setStatusCode(500);
      response.setBody({ error: 'Twilio client initialization failed' });
      return callback(null, response);
    }
    
    const conversationsClient = client.conversations.v1.services(context.CONVERSATIONS_SERVICE_SID);
    
    // Use a unique name based on the user's identity
    const uniqueConversationName = identity;
    
    // Try to find or create the conversation
    let conversation;
    try {
      // Try to fetch the conversation by unique name first
      console.log(`Trying to fetch conversation with unique name: ${uniqueConversationName}`);
      conversation = await conversationsClient.conversations(uniqueConversationName).fetch();
      console.log(`Found existing conversation: ${conversation.sid}`);
    } catch (error) {
      // Conversation doesn't exist, create a new one
      console.log(`Creating new conversation for ${identity}`);
      conversation = await conversationsClient.conversations.create({
        friendlyName: `Website Chat - ${identity}`,
        uniqueName: uniqueConversationName
      });
      console.log(`Created new conversation: ${conversation.sid}`);
      
      // Add the bot as a participant
      console.log(`Adding rfa_agent to conversation: ${conversation.sid}`);
      await conversationsClient.conversations(conversation.sid).participants.create({
        identity: 'rfa_agent'
      });
      
      // Send a welcome message
      console.log(`Sending welcome message to conversation: ${conversation.sid}`);
      await conversationsClient.conversations(conversation.sid).messages.create({
        author: 'rfa_agent',
        body: "Hello! I'm your community resource assistant. How can I help you today? I can connect you with local resources for housing, education, healthcare, and more."
      });
    }
    
    // Now check if the user is already a participant
    try {
      // Try to fetch the participant
      await conversationsClient.conversations(conversation.sid).participants(identity).fetch();
      console.log(`User ${identity} is already a participant in conversation ${conversation.sid}`);
    } catch (error) {
      // User is not a participant, add them
      console.log(`Adding user ${identity} to conversation ${conversation.sid}`);
      await conversationsClient.conversations(conversation.sid).participants.create({
        identity: identity
      });
    }
    
    // Return the conversation SID
    console.log(`Returning conversation SID: ${conversation.sid} for identity: ${identity}`);
    response.setStatusCode(200);
    response.setBody({
      conversationSid: conversation.sid,
      identity: identity
    });
    
    return callback(null, response);
  } catch (error) {
    console.error('Error creating/joining conversation:', error);
    response.setStatusCode(500);
    response.setBody({ error: error.message, stack: error.stack });
    return callback(null, response);
  }
}; 