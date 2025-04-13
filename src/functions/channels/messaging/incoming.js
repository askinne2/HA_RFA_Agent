console.log('💫 USING SRC VERSION OF incoming.js 💫');
console.log('📁 Current working directory:', process.cwd());
console.log('🔄 Current function path:', __filename);

// Import AI service modules
const { 
  detectIntent, 
  detectLanguage, 
  extractLocation, 
  extractNeed 
} = require('../../../ai/services/detection');

const { 
  generateConversationResponse, 
  getResponseTemplate 
} = require('../../../ai/services/conversation');

const {
  loadResourceGuide,
  findMatchingResources,
  formatResourceResponse,
  normalizeLanguage
} = require('../../../ai/services/resources');

const path = require('path');
const twilio = require('twilio');

// Load the enhanced resource guide
const resourceGuide = loadResourceGuide();

// Simple in-memory state management for testing
// In production, use a persistent store (Redis, DynamoDB, Twilio Sync)
const conversationState = {};

// Conversation states
const CONVERSATION_STATES = {
  INITIAL: 'initial',
  LANGUAGE_DETECTED: 'language_detected',
  LOCATION_ASKED: 'location_asked',
  NEED_ASKED: 'need_asked',
  PROVIDING_RESOURCES: 'providing_resources',
  CASUAL_CONVERSATION: 'casual_conversation'
};

// Helper function to get conversation state
function getState(from) {
  return conversationState[from] || { state: CONVERSATION_STATES.INITIAL, data: {} };
}

// Helper function to set conversation state
function setState(from, state, data = {}) {
  conversationState[from] = {
    state,
    data: { ...getState(from).data, ...data }
  };
  console.log(`State updated for ${from}: ${state}`, data);
}

exports.handler = async function(context, event, callback) {
  const twiml = new twilio.twiml.MessagingResponse();
  
  try {
    const message = event.Body;
    const from = event.From;
    
    // Get conversation state
    const userState = getState(from);
    const state = userState.state;
    const stateData = userState.data;
    
    console.log('Current state:', state, stateData);
    
    // Detect language
    let language = stateData.language || await detectLanguage(message);
    
    // Detect intent
    let intent = await detectIntent(message);
    console.log(`Detected intent: ${intent}`);
    
    // Handle casual conversation and greetings
    if (intent === 'greeting' || intent === 'casual' || intent === 'farewell' || intent === 'other') {
      // Store the language preference
      setState(from, CONVERSATION_STATES.CASUAL_CONVERSATION, { language });
      
      if (intent === 'greeting') {
        twiml.message(getResponseTemplate('greeting', language));
      } else if (intent === 'farewell') {
        twiml.message(getResponseTemplate('farewell', language));
      } else {
        // Use conversational AI for casual chat
        const response = await generateConversationResponse({ 
          language, 
          state: CONVERSATION_STATES.CASUAL_CONVERSATION,
          message,
          context: stateData.conversationHistory || ''
        });
        
        // Update conversation history for context
        setState(from, CONVERSATION_STATES.CASUAL_CONVERSATION, { 
          conversationHistory: `${stateData.conversationHistory || ''}\nUser: ${message}\nAssistant: ${response}`.trim()
        });
        
        twiml.message(response);
      }
      
      // Add a gentle prompt for resources if appropriate
      if (intent !== 'farewell' && !stateData.promptedForResources) {
        setTimeout(() => {
          twiml.message(getResponseTemplate('resourcePrompt', language));
        }, 500);
        
        setState(from, CONVERSATION_STATES.CASUAL_CONVERSATION, { promptedForResources: true });
      }
    }
    // Handle resource requests and specific information
    else {
      // Try to extract location and need in one go for direct requests
      let zipcode = await extractLocation(message);
      let need = await extractNeed(message);
      
      console.log(`Extracted info - Language: ${language}, Zipcode: ${zipcode}, Need: ${need}`);
      
      // If we have both location and need, process as direct request
      if (zipcode !== 'none' && need) {
        console.log('Processing as direct request');
        twiml.message(getResponseTemplate('processing', language));
        
        // Find matching resources
        const matches = findMatchingResources({
          language,
          zipcode,
          category: need
        });
        
        const response = formatResourceResponse(matches, language);
        twiml.message(response);
      }
      // Otherwise, proceed with conversational flow
      else {
        console.log('Processing as conversational flow');
        
        // Detect language if in initial state
        if (state === CONVERSATION_STATES.INITIAL) {
          setState(from, CONVERSATION_STATES.LANGUAGE_DETECTED, { language });
          twiml.message(getResponseTemplate('askLocation', language));
        }
        
        // Handle location if language is detected
        else if (state === CONVERSATION_STATES.LANGUAGE_DETECTED) {
          if (zipcode === 'none') {
            twiml.message(getResponseTemplate('noLocation', language));
          } else {
            setState(from, CONVERSATION_STATES.LOCATION_ASKED, { zipcode });
            twiml.message(getResponseTemplate('askNeed', language));
          }
        }
        
        // Handle need if location is provided
        else if (state === CONVERSATION_STATES.LOCATION_ASKED) {
          setState(from, CONVERSATION_STATES.NEED_ASKED, { need });
          twiml.message(getResponseTemplate('processing', language));
          
          // Find matching resources
          const matches = findMatchingResources({
            language: stateData.language,
            zipcode: stateData.zipcode,
            category: need
          });
          
          const response = formatResourceResponse(matches, stateData.language);
          twiml.message(response);
          
          // Reset conversation state
          setState(from, CONVERSATION_STATES.INITIAL);
        }
        
        // Handle if we're already in casual conversation
        else if (state === CONVERSATION_STATES.CASUAL_CONVERSATION) {
          if (intent === 'resource_request') {
            twiml.message(getResponseTemplate('askLocation', language));
            setState(from, CONVERSATION_STATES.LANGUAGE_DETECTED, { language });
          } else if (intent === 'location') {
            if (zipcode !== 'none') {
              setState(from, CONVERSATION_STATES.LOCATION_ASKED, { zipcode });
              twiml.message(getResponseTemplate('askNeed', language));
            } else {
              twiml.message(getResponseTemplate('noLocation', language));
            }
          } else {
            // Continue casual conversation
            const response = await generateConversationResponse({ 
              language, 
              state: CONVERSATION_STATES.CASUAL_CONVERSATION,
              message,
              context: stateData.conversationHistory || ''
            });
            
            // Update conversation history for context
            setState(from, CONVERSATION_STATES.CASUAL_CONVERSATION, { 
              conversationHistory: `${stateData.conversationHistory || ''}\nUser: ${message}\nAssistant: ${response}`.trim()
            });
            
            twiml.message(response);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error processing message:', error);
    twiml.message('Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo más tarde.\n\nSorry, there was an error processing your message. Please try again later.');
  }
  
  callback(null, twiml);
}; 