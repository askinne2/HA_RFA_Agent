console.log('💫 USING SRC VERSION OF messageAdded.protected.js 💫');
console.log('🔧 Utils asset path:', Runtime.getAssets()["/utils.js"].path);

const {
  signRequest,
  getAssistantSid,
  sendMessageToAssistant,
  readConversationAttributes,
} = require(Runtime.getAssets()["/utils.js"].path);

// Import the existing functionality
const { OpenAI } = require('@langchain/openai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const fs = require('fs');
const path = require('path');

// Load the enhanced resource guide
let resourceGuide;
try {
  const resourceGuidePath = path.join(process.cwd(), 'data/resources/enhanced_resource_guide.json');
  console.log(`🔍 Attempting to load resource guide from: ${resourceGuidePath}`);
  const fileContent = fs.readFileSync(resourceGuidePath, 'utf-8');
  resourceGuide = JSON.parse(fileContent);
  console.log(`Successfully loaded enhanced resource guide with ${resourceGuide.resources.length} resources`);
} catch (error) {
  console.error('Error loading enhanced resource guide:', error.message);
  // Use a minimal fallback resource guide for testing
  resourceGuide = {
    version: "1.0",
    last_updated: "2025-04-12",
    resources: [],
    categories: {
      primary: ["Housing", "Education", "Healthcare", "Legal", "Employment"],
      subcategories: {
        "Housing": ["Rental", "Homeless", "Emergency"],
        "Education": ["ESL", "GED", "K-12"],
        "Healthcare": ["Medical", "Mental", "Dental"],
        "Legal": ["Immigration", "Criminal", "Civil"],
        "Employment": ["Job Search", "Training", "Resume"]
      }
    },
    matching_criteria: {
      priority_factors: ["language_match", "geographic_proximity", "income_eligibility"],
      scoring_weights: {
        language_match: 0.3,
        geographic_proximity: 0.2,
        income_eligibility: 0.2,
        service_availability: 0.15,
        specialized_services: 0.15
      }
    }
  };
}

// Initialize OpenAI
const openai = new OpenAI({
  configuration: {
    apiKey: process.env.OPENAI_API_KEY,
    // Use the fine-tuned model if available, otherwise use the default model
    defaultModel: process.env.OPENAI_MODEL || 'gpt-4o'
  },
});

// Import prompts from incoming.js
const intentDetectionPrompt = ChatPromptTemplate.fromTemplate(`
  Determine the intent of the following message. Respond with only one of these categories:
  - greeting (if the message is a greeting like hello, hi, etc.)
  - casual (if the message is casual conversation, small talk, etc.)
  - resource_request (if the person is asking for specific resources or help)
  - location (if the message contains a location or zipcode)
  - category (if the message refers to a specific category of need)
  - farewell (if the message is a goodbye, thank you, etc.)
  - other (if none of the above)
  
  Message: {message}
`);

// Add language detection prompt
const languageDetectionPrompt = ChatPromptTemplate.fromTemplate(`
  Determine the language of the following message. Respond with only "en" for English or "es" for Spanish.
  Message: {message}
`);

const locationExtractionPrompt = ChatPromptTemplate.fromTemplate(`
  Extract the zipcode from the following message. If no zipcode is found, respond with "none".
  Provide only the zipcode without any extra text or newlines.
  Message: {message}
`);

const needExtractionPrompt = ChatPromptTemplate.fromTemplate(`
  Analyze the following message and determine the main need from these categories: 
  Housing, Education, Healthcare, Legal, Employment, Multi Services, Churches, Food.
  Respond with only the category name without any extra text or newlines.
  Message: {message}
`);

// Add a conversational prompt for casual chat with personality
const conversationPrompt = ChatPromptTemplate.fromTemplate(`
  You are a compassionate, bilingual community assistant representing the Hispanic Alliance of South Carolina.
  Your name is Maria.
  
  Your job is to help people who are struggling or in need. Many may be dealing with housing issues, legal problems, healthcare challenges, or trying to find education resources.
  
  Primary goal: Help users find community resources while maintaining a natural, friendly conversation.
  
  Current conversation state: {state}
  User's language: {language}
  Previous info (if available): User zipcode: {zipcode}, User need: {category}
  
  Always respond as if you are speaking with a neighbor — warmly, clearly, and without judgment. Keep responses short and practical. 
  
  When appropriate, guide the conversation toward helping them find resources, but don't force it.
  If they're making small talk, respond naturally and be engaging.
  If they seem to need resources, gently ask for their zipcode and needs when it feels natural in the conversation.
  
  NEVER guess. If you're unsure, say: "I'm not sure, but I can connect you with someone who can help!"
  
  Always prioritize clarity, encouragement, and useful resources (e.g. phone numbers, links, organization names).
  
  If they're speaking Spanish, respond in Spanish. If they're speaking English, respond in English.
  
  Close your messages with a helpful tone:  
  - "Let me know if I can help with anything else."  
  - "Estoy aquí si necesitas más ayuda."
  
  You are here to serve with dignity, respect, and compassion.
  
  User message: {message}
  
  Respond in a helpful, personable way:
`);

// Add language-specific response templates
const prompts = {
  en: {
    askLocation: "What's your zipcode? This helps us find resources near you.",
    askNeed: "What kind of help are you looking for? (e.g., housing, education, healthcare, legal, employment)",
    noLocation: "I couldn't find a zipcode in your message. Please provide your zipcode.",
    processing: "Let me find resources that can help you...",
    greeting: "Hello! I'm your community resource assistant. How can I help you today? I can connect you with local resources for housing, education, healthcare, and more.",
    farewell: "Thank you for using our service. Feel free to reach out if you need any more help in the future!",
    resourcePrompt: "I'm here to help you find community resources. Can you tell me your zipcode and what kind of assistance you're looking for?"
  },
  es: {
    askLocation: "¿Cuál es tu código postal? Esto nos ayuda a encontrar recursos cerca de ti.",
    askNeed: "¿Qué tipo de ayuda necesitas? (por ejemplo, vivienda, educación, atención médica, legal, empleo)",
    noLocation: "No pude encontrar un código postal en tu mensaje. Por favor, proporciona tu código postal.",
    processing: "Déjame encontrar recursos que puedan ayudarte...",
    greeting: "¡Hola! Soy tu asistente de recursos comunitarios. ¿Cómo puedo ayudarte hoy? Puedo conectarte con recursos locales para vivienda, educación, atención médica y más.",
    farewell: "¡Gracias por usar nuestro servicio! No dudes en contactarnos si necesitas más ayuda en el futuro.",
    resourcePrompt: "Estoy aquí para ayudarte a encontrar recursos comunitarios. ¿Puedes decirme tu código postal y qué tipo de asistencia necesitas?"
  }
};

// Simple in-memory state management for Conversations
const conversationStates = {};

/**
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 * @param {{}} event
 * @param {import('@twilio-labs/serverless-runtime-types/types').ServerlessCallback} callback
 */
exports.handler = async function (context, event, callback) {
  try {
    const { ConversationSid, ChatServiceSid, Author, Body } = event;
    const AssistantIdentity =
      typeof event.AssistantIdentity === "string"
        ? event.AssistantIdentity
        : "rfa_agent";

    // Skip processing if the message is from the assistant/agent
    if (Author === 'rfa_agent') {
      return callback(null, "");
    }

    console.log(`Processing message from ${Author} in conversation ${ConversationSid}: "${Body}"`);

    let identity = Author.includes(":") ? Author : `user_id:${Author}`;

    // For WordPress chat widget integration, use the raw Author value as identity
    // since it's already in the format of a session ID
    if (Author.startsWith('user_')) {
      identity = Author;
    }

    // Direct approach without using Twilio client or conversation attributes
    try {
      // Get or initialize conversation state from Conversation attributes
      // This replaces the in-memory state with persistent attributes
      try {
        const twilioClient = require('twilio')(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);
        
        // Get the current conversation attributes
        const conversation = await twilioClient.conversations.v1
          .services(ChatServiceSid)
          .conversations(ConversationSid)
          .fetch();
        
        let userState;
        
        // Parse existing attributes or create new ones
        if (conversation.attributes) {
          const attributes = JSON.parse(conversation.attributes);
          userState = attributes.state || { state: 'initial', data: {} };
          console.log(`Retrieved state from conversation attributes: ${userState.state}`, userState.data);
        } else {
          userState = { state: 'initial', data: {} };
          console.log(`Initializing state for conversation ${ConversationSid}`);
        }
        
        // Detect language first - ALWAYS detect from the current message
        const languageChain = languageDetectionPrompt.pipe(openai).pipe(new StringOutputParser());
        let language = await languageChain.invoke({ message: Body });
        language = language.trim().toLowerCase();
        
        if (language !== 'en' && language !== 'es') {
          console.log(`Invalid language detected: "${language}", defaulting to "en"`);
          language = 'en';
        }
        
        // Override stored language with fresh detection for each message
        userState.data.language = language;
        console.log(`Detected language: ${language}`);
        
        // Process the message using the intent detection pipeline
        const intentChain = intentDetectionPrompt.pipe(openai).pipe(new StringOutputParser());
        let intent = await intentChain.invoke({ message: Body });
        intent = intent.trim().toLowerCase();
        
        console.log(`Detected intent: ${intent}`);
        
        // For simplicity, we'll send a response based on intent
        let responseMessage = '';
        
        // If this is a direct resource request, use the structured approach
        if ((intent === 'resource_request' || intent === 'category') && 
            (Body.toLowerCase().includes('resource') || Body.toLowerCase().includes('help with') || 
             Body.toLowerCase().includes('need help') || Body.toLowerCase().includes('looking for help'))) {
          // Use existing resource matching logic
          // Try to extract needed information
          const locationChain = locationExtractionPrompt.pipe(openai).pipe(new StringOutputParser());
          let zipcode = await locationChain.invoke({ message: Body });
          zipcode = zipcode.trim();
          
          const needChain = needExtractionPrompt.pipe(openai).pipe(new StringOutputParser());
          let category = await needChain.invoke({ message: Body });
          category = category.trim();
          
          console.log(`Extracted info - Zipcode: ${zipcode}, Category: ${category}`);
          
          // Store in conversation state
          userState.data.zipcode = zipcode !== 'none' ? zipcode : userState.data.zipcode;
          userState.data.category = category;
          
          // If we have both zipcode and category, look for resources
          if ((userState.data.zipcode && userState.data.zipcode !== 'none') && userState.data.category) {
            console.log(`Searching for resources - Category: ${userState.data.category}, Zipcode: ${userState.data.zipcode}`);
            
            // Find matching resources using direct resource matching
            const matches = findResourcesDirectly({
              language: language,
              zipcode: userState.data.zipcode,
              category: userState.data.category
            });
            
            responseMessage = formatResourceResponse(matches, language);
            userState.state = 'resources_provided';
          } else {
            // Use conversational AI instead of templates for asking for missing info
            const conversationChain = conversationPrompt.pipe(openai).pipe(new StringOutputParser());
            const state = userState.state;
            const zipcode = userState.data.zipcode || 'unknown';
            const category = userState.data.category || 'unknown';
            
            responseMessage = await conversationChain.invoke({ 
              language, 
              state, 
              zipcode, 
              category, 
              message: Body 
            });
            
            if (!userState.data.zipcode || userState.data.zipcode === 'none') {
              userState.state = 'asked_for_zipcode';
            } else if (!userState.data.category) {
              userState.state = 'asked_for_category';
            }
          }
        } else if (intent === 'location') {
          // Special handling for explicit location mentions
          const locationChain = locationExtractionPrompt.pipe(openai).pipe(new StringOutputParser());
          let zipcode = await locationChain.invoke({ message: Body });
          zipcode = zipcode.trim();
          
          if (zipcode !== 'none') {
            userState.data.zipcode = zipcode;
            // Update state
            if (userState.state === 'asked_for_zipcode') {
              userState.state = 'asked_for_category';
            }
            
            // Use conversational AI for response
            const conversationChain = conversationPrompt.pipe(openai).pipe(new StringOutputParser());
            const state = userState.state;
            const category = userState.data.category || 'unknown';
            
            responseMessage = await conversationChain.invoke({ 
              language, 
              state, 
              zipcode, 
              category, 
              message: Body 
            });
          } else {
            // Use conversational AI for response
            const conversationChain = conversationPrompt.pipe(openai).pipe(new StringOutputParser());
            const state = userState.state;
            const zipcode = userState.data.zipcode || 'unknown';
            const category = userState.data.category || 'unknown';
            
            responseMessage = await conversationChain.invoke({ 
              language, 
              state, 
              zipcode, 
              category, 
              message: Body 
            });
          }
        } else {
          // For all other intents, use conversational AI
          const conversationChain = conversationPrompt.pipe(openai).pipe(new StringOutputParser());
          const state = userState.state;
          const zipcode = userState.data.zipcode || 'unknown';
          const category = userState.data.category || 'unknown';
          
          responseMessage = await conversationChain.invoke({ 
            language, 
            state, 
            zipcode, 
            category, 
            message: Body 
          });
          
          // Update state based on intent for context
          if (intent === 'greeting') {
            userState.state = 'greeting';
          } else if (intent === 'farewell') {
            userState.state = 'farewell';
          } else if (userState.state === 'initial') {
            userState.state = 'casual_conversation';
          }
        }
        
        // Save the updated state to conversation attributes
        await twilioClient.conversations.v1
          .services(ChatServiceSid)
          .conversations(ConversationSid)
          .update({
            attributes: JSON.stringify({ state: userState })
          });
          
        console.log(`Saved updated state: ${userState.state}`, userState.data);
        
        // If we have a response, try to send it
        if (responseMessage) {
          console.log(`Sending direct response: ${responseMessage.substring(0, 50)}...`);
          
          try {
            // Get suggestions based on conversation state
            const suggestions = getSuggestions(userState.state, language, userState.data.category);
            
            if (suggestions.length > 0) {
              // Send structured message with text and suggestions
              console.log(`Adding ${suggestions.length} suggestion buttons`);
              
              // Send as JSON with content type
              await twilioClient.conversations.v1
                .services(ChatServiceSid)
                .conversations(ConversationSid)
                .messages.create({
                  body: JSON.stringify({
                    text: responseMessage,
                    suggestions: suggestions
                  }),
                  contentType: 'application/json',
                  author: AssistantIdentity,
                });
            } else {
              // Regular text message without suggestions
              await twilioClient.conversations.v1
                .services(ChatServiceSid)
                .conversations(ConversationSid)
                .messages.create({
                  body: responseMessage,
                  author: AssistantIdentity,
                });
            }
            
            console.log("Response message sent successfully");
          } catch (clientError) {
            console.error("Error sending message:", clientError.message);
          }
        }
      } catch (attributesError) {
        console.error("Error handling conversation attributes:", attributesError);
      }
    } catch (processingError) {
      console.error("Error in message processing:", processingError);
    }
    
    callback(null, "");
  } catch (error) {
    console.error('Error in handler:', error);
    callback(null, ""); // Return empty response to avoid 500 errors
  }
};

// Helper function to find resources directly - based on incoming.js
function findResourcesDirectly(params) {
  console.log('Using direct resource matching for:', params);
  
  // Normalize parameters
  const normalizedParams = {
    language: normalizeLanguage(params.language),
    zipcode: params.zipcode,
    category: params.category
  };
  
  // Log the matched parameters we're using
  console.log('Normalized params:', normalizedParams);
  
  // Filter resources by language, zipcode, and category
  const filteredResources = resourceGuide.resources.filter(resource => {
    // Check language match
    const resourceLanguages = resource.basic_info?.languages?.map(l => normalizeLanguage(l)) || [];
    const languageMatch = resourceLanguages.includes(normalizedParams.language);
    
    // Check zipcode match if provided
    let zipcodeMatch = true;
    if (normalizedParams.zipcode && normalizedParams.zipcode !== 'none') {
      // If the resource has zipcodes defined
      if (resource.eligibility?.service_area?.zipcodes?.length > 0) {
        zipcodeMatch = resource.eligibility.service_area.zipcodes.includes(normalizedParams.zipcode);
      }
    }
    
    // Check category match if provided
    let categoryMatch = true;
    if (normalizedParams.category) {
      // Case-insensitive comparison for categories
      const resourceCategory = resource.basic_info?.category || '';
      categoryMatch = resourceCategory.toLowerCase() === normalizedParams.category.toLowerCase();
      
      // If no direct category match, also check if it's Multi Services since those are general providers
      if (!categoryMatch && resourceCategory === 'Multi Services') {
        categoryMatch = true;
      }
    }
    
    const isMatch = languageMatch && zipcodeMatch && categoryMatch;
    
    // Debug log if this is a match
    if (isMatch) {
      console.log(`Match found: ${resource.basic_info.title_en} (Category: ${resource.basic_info.category})`);
    }
    
    return isMatch;
  });
  
  console.log(`Found ${filteredResources.length} matching resources`);
  
  // If no exact matches, try a more relaxed search for Multi Services
  if (filteredResources.length === 0) {
    const relaxedResources = resourceGuide.resources.filter(resource => {
      const resourceLanguages = resource.basic_info?.languages?.map(l => normalizeLanguage(l)) || [];
      const languageMatch = resourceLanguages.includes(normalizedParams.language);
      return languageMatch && resource.basic_info?.category === 'Multi Services';
    });
    
    if (relaxedResources.length > 0) {
      console.log(`Found ${relaxedResources.length} Multi Services resources as fallback`);
      return formatResourceMatches(relaxedResources, normalizedParams.language, 0.8);
    }
  }
  
  // Return the matches in the expected format
  return formatResourceMatches(filteredResources, normalizedParams.language, 0.9);
}

// Helper function to format resources into the expected match structure
function formatResourceMatches(resources, language, baseScore) {
  return resources.map((resource, index) => {
    // Decrease score slightly for later items to provide ranking
    const score = baseScore - (index * 0.02);
    
    return {
      score,
      resource: {
        title: language === 'es' && resource.basic_info?.title_es ? 
               resource.basic_info.title_es : 
               resource.basic_info.title_en,
        category: resource.basic_info?.category,
        subcategories: resource.basic_info?.subcategories,
        languages: resource.basic_info?.languages,
        description: language === 'es' && resource.basic_info?.description_es ? 
                    resource.basic_info.description_es : 
                    resource.basic_info.description_en,
        contact: {
          phone: resource.basic_info?.contact_phone,
          email: resource.basic_info?.contact_email,
          website: resource.basic_info?.website
        },
        address: resource.basic_info?.address
      },
      rationale: {
        summary: `Matched based on ${getMatchReason(resource, language)}`,
        factors: {}
      }
    };
  }).sort((a, b) => b.score - a.score);
}

// Helper function to provide a reason for the match
function getMatchReason(resource, language) {
  const reasons = [];
  
  if (resource.basic_info?.languages?.map(l => normalizeLanguage(l)).includes(language)) {
    reasons.push("language accessibility");
  }
  
  if (resource.basic_info?.category) {
    reasons.push(`service type (${resource.basic_info.category})`);
  }
  
  if (resource.eligibility?.service_area?.zipcodes?.length > 0) {
    reasons.push("location");
  }
  
  return reasons.join(", ") || "general service availability";
}

// Helper function to normalize language codes
function normalizeLanguage(language) {
  if (!language) return 'en';
  
  const lowercased = language?.toLowerCase()?.trim();
  
  if (lowercased === 'english' || lowercased === 'inglés' || lowercased === 'ingles') return 'en';
  if (lowercased === 'spanish' || lowercased === 'español' || lowercased === 'espanol') return 'es';
  
  return lowercased;
}

// Helper function to format resource response
function formatResourceResponse(matches, language) {
  if (matches.length === 0) {
    return language === 'es' 
      ? 'Lo siento, no pude encontrar recursos que coincidan con tu búsqueda.'
      : 'Sorry, I couldn\'t find any resources matching your search.';
  }
  
  const response = language === 'es'
    ? 'Aquí hay algunos recursos que pueden ayudarte:\n\n'
    : 'Here are some resources that might help you:\n\n';
  
  return response + matches.slice(0, 3).map(match => {
    const resource = match.resource;
    const title = resource.title || '[No Title Available]';
    const description = resource.description || '';
    const phone = resource.contact?.phone || '';
    const email = resource.contact?.email || '';
    const contact = [phone, email].filter(Boolean).join(' / ');
    
    let result = `${title}`;
    if (description) result += `\n${description}`;
    if (contact) result += `\nContact: ${contact}`;
    if (resource.address) result += `\nAddress: ${resource.address}`;
    if (resource.contact?.website) result += `\nWebsite: ${resource.contact.website}`;
    
    return result;
  }).join('\n\n');
}

// Helper function to get suggestions based on conversation state and language
function getSuggestions(state, language, category) {
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
