/**
 * Prompts for detecting user intents, language, location, and needs
 */
const { ChatPromptTemplate } = require('@langchain/core/prompts');

/**
 * Prompt for detecting user intent
 */
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

/**
 * Prompt for language detection
 */
const languageDetectionPrompt = ChatPromptTemplate.fromTemplate(`
  Determine the language of the following message. Respond with only "en" for English or "es" for Spanish.
  Message: {message}
`);

/**
 * Prompt for extracting location information
 */
const locationExtractionPrompt = ChatPromptTemplate.fromTemplate(`
  Extract the zipcode from the following message. If no zipcode is found, respond with "none".
  Provide only the zipcode without any extra text or newlines.
  Message: {message}
`);

/**
 * Prompt for extracting user needs or categories
 */
const needExtractionPrompt = ChatPromptTemplate.fromTemplate(`
  Analyze the following message and determine the main need from these categories: 
  Housing, Education, Healthcare, Legal, Employment, Multi Services, Churches, Food.
  Respond with only the category name without any extra text or newlines.
  Message: {message}
`);

module.exports = {
  intentDetectionPrompt,
  languageDetectionPrompt,
  locationExtractionPrompt,
  needExtractionPrompt
}; 