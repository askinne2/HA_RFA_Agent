console.log('💫 USING SRC VERSION OF incoming.js 💫');
console.log('📁 Current working directory:', process.cwd());
console.log('🔄 Current function path:', __filename);

const { OpenAI } = require('@langchain/openai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

// Load the enhanced resource guide
const resourceGuidePath = path.join(process.cwd(), 'docs/enhanced_resource_guide.json');
let resourceGuide;
try {
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
  },
});

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

// Intent detection prompt
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

// Conversational prompt for casual chat
const conversationPrompt = ChatPromptTemplate.fromTemplate(`
  You are a helpful and friendly community resource assistant. Your primary goal is to connect people with local resources for their needs.
  
  Respond to the following message in a conversational but brief way. If the user seems to be asking for help with a specific need, 
  suggest they provide their zipcode and what kind of resources they're looking for. Keep your response concise and friendly.
  
  User's preferred language: {language}
  Previous context (if any): {context}
  User message: {message}
  
  Response:
`);

// Language detection prompt
const languageDetectionPrompt = ChatPromptTemplate.fromTemplate(`
  Determine the language of the following message. Respond with only "en" for English or "es" for Spanish.
  Message: {message}
`);

// Location extraction prompt
const locationExtractionPrompt = ChatPromptTemplate.fromTemplate(`
  Extract the zipcode from the following message. If no zipcode is found, respond with "none".
  Provide only the zipcode without any extra text or newlines.
  Message: {message}
`);

// Need extraction prompt
const needExtractionPrompt = ChatPromptTemplate.fromTemplate(`
  Analyze the following message and determine the main need from these categories: 
  Housing, Education, Healthcare, Legal, Employment, Multi Services, Churches, Food.
  Respond with only the category name without any extra text or newlines.
  Message: {message}
`);

// Response generation prompts
const prompts = {
  en: {
    askLocation: "What's your zipcode? This helps us find resources near you.",
    askNeed: "What kind of help are you looking for? (e.g., housing, education, healthcare, legal, employment)",
    noLocation: "I couldn't find a zipcode in your message. Please provide your zipcode.",
    processing: "Let me find resources that can help you...",
    greeting: "Hello! I'm your community resource assistant. How can I help you today? I can connect you with local resources for housing, education, healthcare, and more.",
    farewell: "Thank you for using our service. Feel free to reach out if you need any more help in the future!",
    resourcePrompt: "If you're looking for specific resources, please let me know what kind of assistance you need and your zipcode."
  },
  es: {
    askLocation: "¿Cuál es tu código postal? Esto nos ayuda a encontrar recursos cerca de ti.",
    askNeed: "¿Qué tipo de ayuda necesitas? (por ejemplo, vivienda, educación, atención médica, legal, empleo)",
    noLocation: "No pude encontrar un código postal en tu mensaje. Por favor, proporciona tu código postal.",
    processing: "Déjame encontrar recursos que puedan ayudarte...",
    greeting: "¡Hola! Soy tu asistente de recursos comunitarios. ¿Cómo puedo ayudarte hoy? Puedo conectarte con recursos locales para vivienda, educación, atención médica y más.",
    farewell: "¡Gracias por usar nuestro servicio! No dudes en contactarnos si necesitas más ayuda en el futuro.",
    resourcePrompt: "Si estás buscando recursos específicos, por favor dime qué tipo de asistencia necesitas y tu código postal."
  }
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
    const languageChain = languageDetectionPrompt.pipe(openai).pipe(new StringOutputParser());
    let language = stateData.language || await languageChain.invoke({ message });
    // Trim any whitespace or newlines from the language value
    language = language.trim();
    
    if (language !== 'en' && language !== 'es') {
      console.log(`Invalid language detected: "${language}", defaulting to "en"`);
      language = 'en';
    }
    
    // Detect intent
    const intentChain = intentDetectionPrompt.pipe(openai).pipe(new StringOutputParser());
    let intent = await intentChain.invoke({ message });
    intent = intent.trim().toLowerCase();
    
    console.log(`Detected intent: ${intent}`);
    
    // Handle casual conversation and greetings
    if (intent === 'greeting' || intent === 'casual' || intent === 'farewell' || intent === 'other') {
      // Store the language preference
      setState(from, CONVERSATION_STATES.CASUAL_CONVERSATION, { language });
      
      if (intent === 'greeting') {
        twiml.message(prompts[language].greeting);
      } else if (intent === 'farewell') {
        twiml.message(prompts[language].farewell);
      } else {
        // Use conversational AI for casual chat
        const conversationChain = conversationPrompt.pipe(openai).pipe(new StringOutputParser());
        const context = stateData.conversationHistory || '';
        
        const response = await conversationChain.invoke({ 
          language, 
          context, 
          message 
        });
        
        // Update conversation history for context
        setState(from, CONVERSATION_STATES.CASUAL_CONVERSATION, { 
          conversationHistory: `${context}\nUser: ${message}\nAssistant: ${response}`.trim()
        });
        
        twiml.message(response);
      }
      
      // Add a gentle prompt for resources if appropriate
      if (intent !== 'farewell' && !stateData.promptedForResources) {
        setTimeout(() => {
          twiml.message(prompts[language].resourcePrompt);
        }, 500);
        
        setState(from, CONVERSATION_STATES.CASUAL_CONVERSATION, { promptedForResources: true });
      }
    }
    // Handle resource requests and specific information
    else {
      // Try to extract location and need in one go for direct requests
      const locationChain = locationExtractionPrompt.pipe(openai).pipe(new StringOutputParser());
      let zipcode = await locationChain.invoke({ message });
      zipcode = zipcode.trim();
      
      const needChain = needExtractionPrompt.pipe(openai).pipe(new StringOutputParser());
      let need = await needChain.invoke({ message });
      need = need.trim();
      
      console.log(`Extracted info - Language: ${language}, Zipcode: ${zipcode}, Need: ${need}`);
      
      // If we have both location and need, process as direct request
      if (zipcode !== 'none' && need) {
        console.log('Processing as direct request');
        twiml.message(prompts[language].processing);
        
        // Find matching resources
        const matches = findResourcesDirectly({
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
          twiml.message(prompts[language].askLocation);
        }
        
        // Handle location if language is detected
        else if (state === CONVERSATION_STATES.LANGUAGE_DETECTED) {
          if (zipcode === 'none') {
            twiml.message(prompts[language].noLocation);
          } else {
            setState(from, CONVERSATION_STATES.LOCATION_ASKED, { zipcode });
            twiml.message(prompts[language].askNeed);
          }
        }
        
        // Handle need if location is provided
        else if (state === CONVERSATION_STATES.LOCATION_ASKED) {
          setState(from, CONVERSATION_STATES.NEED_ASKED, { need });
          twiml.message(prompts[language].processing);
          
          // Find matching resources
          const matches = findResourcesDirectly({
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
            twiml.message(prompts[language].askLocation);
            setState(from, CONVERSATION_STATES.LANGUAGE_DETECTED, { language });
          } else if (intent === 'location') {
            if (zipcode !== 'none') {
              setState(from, CONVERSATION_STATES.LOCATION_ASKED, { zipcode });
              twiml.message(prompts[language].askNeed);
            } else {
              twiml.message(prompts[language].noLocation);
            }
          } else {
            // Continue casual conversation
            const conversationChain = conversationPrompt.pipe(openai).pipe(new StringOutputParser());
            const context = stateData.conversationHistory || '';
            
            const response = await conversationChain.invoke({ 
              language, 
              context, 
              message 
            });
            
            // Update conversation history for context
            setState(from, CONVERSATION_STATES.CASUAL_CONVERSATION, { 
              conversationHistory: `${context}\nUser: ${message}\nAssistant: ${response}`.trim()
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

// Helper function to find resources directly without trying to use the TypeScript module
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
    const resourceLanguages = resource.basic_info.languages.map(l => normalizeLanguage(l));
    const languageMatch = resourceLanguages.includes(normalizedParams.language);
    
    // Check zipcode match if provided
    let zipcodeMatch = true;
    if (normalizedParams.zipcode && normalizedParams.zipcode !== 'none') {
      // If the resource has zipcodes defined
      if (resource.eligibility.service_area.zipcodes.length > 0) {
        zipcodeMatch = resource.eligibility.service_area.zipcodes.includes(normalizedParams.zipcode);
      }
    }
    
    // Check category match if provided
    let categoryMatch = true;
    if (normalizedParams.category) {
      // Case-insensitive comparison for categories
      const resourceCategory = resource.basic_info.category || '';
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
      const resourceLanguages = resource.basic_info.languages.map(l => normalizeLanguage(l));
      const languageMatch = resourceLanguages.includes(normalizedParams.language);
      return languageMatch && resource.basic_info.category === 'Multi Services';
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
        title: language === 'es' && resource.basic_info.title_es ? 
               resource.basic_info.title_es : 
               resource.basic_info.title_en,
        category: resource.basic_info.category,
        subcategories: resource.basic_info.subcategories,
        languages: resource.basic_info.languages,
        description: language === 'es' && resource.basic_info.description_es ? 
                    resource.basic_info.description_es : 
                    resource.basic_info.description_en,
        contact: {
          phone: resource.basic_info.contact_phone,
          email: resource.basic_info.contact_email,
          website: resource.basic_info.website
        },
        address: resource.basic_info.address
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
  
  if (resource.basic_info.languages.map(l => normalizeLanguage(l)).includes(language)) {
    reasons.push("language accessibility");
  }
  
  if (resource.basic_info.category) {
    reasons.push(`service type (${resource.basic_info.category})`);
  }
  
  if (resource.eligibility.service_area.zipcodes.length > 0) {
    reasons.push("location");
  }
  
  return reasons.join(", ") || "general service availability";
}

// Helper function to normalize language codes
function normalizeLanguage(language) {
  if (!language) return 'en';
  
  const lowercased = language.toLowerCase().trim();
  
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