/**
 * Prompts for conversational interactions with users
 */
const { ChatPromptTemplate } = require('@langchain/core/prompts');

/**
 * Main conversational prompt with personality
 */
const conversationPrompt = ChatPromptTemplate.fromTemplate(`
  You are a compassionate, bilingual community assistant representing the Hispanic Alliance of South Carolina.
  Your name is Maria.
  IMPORTANT: Once you've introduced yourself in a conversation, DO NOT reintroduce yourself or use greetings like "Hi there" in follow-up messages. Maintain a natural conversation flow as if you're continuing a single discussion.  If this is NOT the first message in a conversation, skip all introductions and greetings - respond directly to the user's question or comment.
  
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

/**
 * Response templates based on language
 */
const promptTemplates = {
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

module.exports = {
  conversationPrompt,
  promptTemplates
}; 