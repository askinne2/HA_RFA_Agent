# Training the Hispanic Alliance Resource Assistant Bot

This document explains how to further train and improve the AI assistant's responses using OpenAI fine-tuning.

## Overview

The Hispanic Alliance Resource Assistant Bot uses OpenAI's language models to provide helpful, compassionate responses to users seeking community resources. You can improve the bot's responses by:

1. Enhancing the system prompt
2. Fine-tuning the model with example conversations
3. Adding more resources to the resource guide

## System Prompt

The system prompt defines the bot's personality, tone, and capabilities. The current system prompt is integrated into the `conversationPrompt` variable in `functions/channels/conversations/messageAdded.protected.js`. 

To modify the bot's behavior, you can update this prompt. Key elements include:
- Identity and backstory (representing Hispanic Alliance)
- Tone (compassionate, helpful, conversational)
- Guidance on handling different user needs
- Language preferences (English/Spanish bilingual support)
- Response formats and closing statements

## Fine-Tuning with Examples

### Training Data

Training examples are stored in `docs/training-examples.jsonl`. Each example consists of a **single** conversation with a system message, user message, and assistant response, all in JSONL format:

```json
{"messages":[{"role":"system","content":"You are a compassionate, bilingual community assistant representing the Hispanic Alliance of South Carolina. Your name is Maria."},{"role":"user","content":"hello"},{"role":"assistant","content":"Hello! I'm Maria from Hispanic Alliance. How can I help you today?"}]}
```

**Important Format Requirements**:
1. Each line must be a complete, valid JSON object with a "messages" array
2. Each messages array must include ONLY the turns that end with an assistant response
3. Include the system message in each example to maintain consistent behavior
4. Multi-turn conversations must be broken into separate examples

For example, a multi-turn conversation must be split like this:

```json
{"messages":[{"role":"system","content":"You are a compassionate assistant..."},{"role":"user","content":"hello"},{"role":"assistant","content":"Hello! I'm Maria. How can I help?"}]}
{"messages":[{"role":"system","content":"You are a compassionate assistant..."},{"role":"user","content":"I need food assistance"},{"role":"assistant","content":"What's your zipcode? This helps me find food resources."}]}
```

This format ensures each training example teaches the model one specific response pattern.

### Adding More Examples

To improve the bot's performance, add more examples to `training-examples.jsonl` covering:
- Common user questions and scenarios
- Different resource categories (housing, healthcare, etc.)
- Both English and Spanish interactions
- Different conversation flows

Make sure each example follows the exact JSON format required by OpenAI.

### Running Fine-Tuning

Use the included script to fine-tune the model:

1. **Upload training data**:
   ```
   node finetune-openai.js upload
   ```
   This will upload your training examples and provide a file ID.

2. **Start fine-tuning**:
   ```
   node finetune-openai.js finetune <file_id>
   ```
   Replace `<file_id>` with the ID from the previous step.

3. **Check status**:
   ```
   node finetune-openai.js status <job_id>
   ```
   Replace `<job_id>` with the ID from the fine-tuning job.

When fine-tuning completes, the script will automatically update your `.env` file with the new model ID.

## Using the Fine-Tuned Model

The codebase is set up to automatically use the fine-tuned model when available. The `OPENAI_MODEL` environment variable in `.env` will be updated automatically after fine-tuning completes.

## Best Practices

1. **Start small**: Begin with 10-20 high-quality examples covering common scenarios.
2. **Test thoroughly**: After fine-tuning, test the model with various inputs before deploying.
3. **Iterative improvements**: Fine-tune in small batches, adding examples that address areas where the bot struggles.
4. **Balance examples**: Include a mix of different resource categories, languages, and conversation flows.
5. **Real conversations**: When possible, use anonymized snippets from actual user conversations.

## Troubleshooting

- If fine-tuning fails, check the OpenAI error message and ensure your training data follows the correct format.
- If responses seem off after fine-tuning, your examples may be conflicting or not diverse enough.
- For specific errors with the fine-tuning process, check the OpenAI documentation. 