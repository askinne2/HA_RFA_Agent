/**
 * AI services for detecting intents, language, and extracting information
 */
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { initializeOpenAI } = require('../models/openai');
const { 
  intentDetectionPrompt, 
  languageDetectionPrompt,
  locationExtractionPrompt,
  needExtractionPrompt 
} = require('../prompts/detection');

/**
 * Initialize OpenAI instance
 */
const openai = initializeOpenAI();

/**
 * Detect the intent of a user message
 * @param {string} message - User message
 * @returns {Promise<string>} Intent category
 */
async function detectIntent(message) {
  const intentChain = intentDetectionPrompt.pipe(openai).pipe(new StringOutputParser());
  let intent = await intentChain.invoke({ message });
  return intent.trim().toLowerCase();
}

/**
 * Detect the language of a user message
 * @param {string} message - User message
 * @returns {Promise<string>} Language code (en/es)
 */
async function detectLanguage(message) {
  const languageChain = languageDetectionPrompt.pipe(openai).pipe(new StringOutputParser());
  let language = await languageChain.invoke({ message });
  language = language.trim().toLowerCase();
  
  if (language !== 'en' && language !== 'es') {
    console.log(`Invalid language detected: "${language}", defaulting to "en"`);
    language = 'en';
  }
  
  return language;
}

/**
 * Extract zipcode from a user message
 * @param {string} message - User message
 * @returns {Promise<string>} Extracted zipcode or 'none'
 */
async function extractLocation(message) {
  const locationChain = locationExtractionPrompt.pipe(openai).pipe(new StringOutputParser());
  let zipcode = await locationChain.invoke({ message });
  return zipcode.trim();
}

/**
 * Extract user need/category from a message
 * @param {string} message - User message
 * @returns {Promise<string>} Extracted category
 */
async function extractNeed(message) {
  const needChain = needExtractionPrompt.pipe(openai).pipe(new StringOutputParser());
  let need = await needChain.invoke({ message });
  return need.trim();
}

module.exports = {
  detectIntent,
  detectLanguage,
  extractLocation,
  extractNeed
}; 