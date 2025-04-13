/**
 * OpenAI model configuration and initialization
 */
const { OpenAI } = require('@langchain/openai');

/**
 * Initialize OpenAI client with default or provided configuration
 * @param {Object} options - Additional configuration options
 * @returns {OpenAI} Configured OpenAI client instance
 */
function initializeOpenAI(options = {}) {
  return new OpenAI({
    configuration: {
      apiKey: process.env.OPENAI_API_KEY,
      // Use the fine-tuned model if available, otherwise use the default model
      defaultModel: process.env.OPENAI_MODEL || options.defaultModel || 'gpt-4o'
    },
  });
}

module.exports = {
  initializeOpenAI
}; 