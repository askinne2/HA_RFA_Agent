/**
 * AI services for conversation and response generation
 */
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { initializeOpenAI } = require('../models/openai');
const { conversationPrompt, promptTemplates } = require('../prompts/conversation');

/**
 * Initialize OpenAI instance
 */
const openai = initializeOpenAI();

/**
 * Generate a response to a user message
 * @param {Object} params - Parameters for response generation
 * @param {string} params.message - User message
 * @param {string} params.language - User language (en/es)
 * @param {string} params.state - Current conversation state
 * @param {string} params.zipcode - User zipcode if available
 * @param {string} params.category - User need/category if available
 * @returns {Promise<string>} Generated response
 */
async function generateConversationResponse(params) {
  const { message, language, state, zipcode, category } = params;
  
  const conversationChain = conversationPrompt.pipe(openai).pipe(new StringOutputParser());
  
  return await conversationChain.invoke({ 
    language, 
    state, 
    zipcode: zipcode || 'unknown', 
    category: category || 'unknown', 
    message 
  });
}

/**
 * Get a text template based on language and template key
 * @param {string} key - Template key
 * @param {string} language - Language code (en/es)
 * @returns {string} Text template
 */
function getResponseTemplate(key, language = 'en') {
  const lang = language in promptTemplates ? language : 'en';
  return promptTemplates[lang][key] || promptTemplates.en[key];
}

/**
 * Generate suggestion buttons for the conversation UI
 * @param {string} state - Current conversation state
 * @param {string} language - User language
 * @param {string} category - Selected category (optional)
 * @returns {Array} Array of suggestion button objects
 */
function getSuggestions(state, language = 'en', category = null) {
  let suggestions = [];
  
  // Default suggestions based on state
  if (state === 'initial' || state === 'greeting') {
    suggestions = language === 'es' 
      ? [
          { text: "Buscar recursos", value: "Necesito ayuda para encontrar recursos" },
          { text: "Información de servicios", value: "Cuéntame sobre sus servicios" }
        ]
      : [
          { text: "Find Resources", value: "I need help finding resources" },
          { text: "Learn About Services", value: "Tell me about your services" }
        ];
  } else if (state === 'asked_for_zipcode') {
    // No suggestions for zipcode - expecting text input
    return [];
  } else if (state === 'asked_for_category' || state === 'resources_provided') {
    // Category suggestions
    suggestions = language === 'es'
      ? [
          { text: "Vivienda", value: "Housing" },
          { text: "Salud", value: "Healthcare" },
          { text: "Legal", value: "Legal" },
          { text: "Educación", value: "Education" },
          { text: "Empleo", value: "Employment" },
          { text: "Alimentación", value: "Food" },
          { text: "Iglesias", value: "Churches" }
        ]
      : [
          { text: "Housing", value: "Housing" },
          { text: "Healthcare", value: "Healthcare" },
          { text: "Legal", value: "Legal" },
          { text: "Education", value: "Education" },
          { text: "Employment", value: "Employment" },
          { text: "Food", value: "Food" },
          { text: "Churches", value: "Churches" }
        ];
  } else if (state === 'casual_conversation') {
    suggestions = language === 'es'
      ? [
          { text: "Buscar recursos", value: "Necesito ayuda para encontrar recursos" },
          { text: "Mi código postal", value: "Mi código postal es " }
        ]
      : [
          { text: "Find Resources", value: "I need help finding resources" },
          { text: "My zipcode", value: "My zipcode is " }
        ];
  }
  
  return suggestions;
}

module.exports = {
  generateConversationResponse,
  getResponseTemplate,
  getSuggestions
}; 