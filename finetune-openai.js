require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Add new validation function before uploadFile
function validateJsonlFile(filePath) {
  try {
    console.log('Validating JSONL file...');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    let isValid = true;
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      try {
        // Try to parse each line as JSON
        const parsed = JSON.parse(line);
        
        // Verify it has the expected format with a messages array
        if (!parsed.messages || !Array.isArray(parsed.messages)) {
          console.error(`Line ${lineNumber}: Missing or invalid 'messages' array`);
          isValid = false;
          continue;
        }
        
        // Check each message in the array
        for (const message of parsed.messages) {
          if (!message.role || !message.content) {
            console.error(`Line ${lineNumber}: Message missing 'role' or 'content'`);
            isValid = false;
          }
        }
      } catch (error) {
        console.error(`Line ${lineNumber}: Invalid JSON - ${error.message}`);
        isValid = false;
      }
    }
    
    if (isValid) {
      console.log('JSONL file validated successfully!');
    } else {
      console.error('JSONL file has errors that need to be fixed before uploading.');
    }
    
    return isValid;
  } catch (error) {
    console.error('Error validating JSONL file:', error.message);
    return false;
  }
}

async function uploadFile() {
  try {
    const filePath = path.join(__dirname, 'docs', 'training-examples.jsonl');
    
    // Validate the file before uploading
    if (!validateJsonlFile(filePath)) {
      throw new Error('JSONL file validation failed. Please fix the errors and try again.');
    }
    
    console.log('Uploading training file...');
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'fine-tune'
    });
    
    console.log('File uploaded successfully:', file.id);
    return file.id;
  } catch (error) {
    console.error('Error uploading file:', error.message);
    throw error;
  }
}

async function createFineTuningJob(fileId) {
  try {
    console.log('Creating fine-tuning job...');
    const fineTuningJob = await openai.fineTuning.jobs.create({
      training_file: fileId,
      model: 'gpt-3.5-turbo', // Using gpt-3.5-turbo which is supported for fine-tuning
      suffix: 'hispanic-alliance-assistant'
    });
    
    console.log('Fine-tuning job created successfully:', fineTuningJob.id);
    console.log('Job status:', fineTuningJob.status);
    return fineTuningJob.id;
  } catch (error) {
    console.error('Error creating fine-tuning job:', error.message);
    throw error;
  }
}

async function checkFineTuningStatus(jobId) {
  try {
    console.log(`Checking status of fine-tuning job ${jobId}...`);
    const job = await openai.fineTuning.jobs.retrieve(jobId);
    
    console.log('Job status:', job.status);
    console.log('Created at:', new Date(job.created_at * 1000).toLocaleString());
    
    if (job.finished_at) {
      console.log('Finished at:', new Date(job.finished_at * 1000).toLocaleString());
    }
    
    if (job.status === 'succeeded') {
      console.log('Fine-tuned model ID:', job.fine_tuned_model);
      console.log('You can now use this model in your application.');
      
      // Update the .env file with the new model
      updateEnvFile(job.fine_tuned_model);
    }
    
    return job;
  } catch (error) {
    console.error('Error checking fine-tuning status:', error.message);
    throw error;
  }
}

function updateEnvFile(modelId) {
  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if OPENAI_MODEL already exists in the .env file
    if (envContent.includes('OPENAI_MODEL=')) {
      // Replace existing model ID
      envContent = envContent.replace(/OPENAI_MODEL=.*/g, `OPENAI_MODEL=${modelId}`);
    } else {
      // Add new model ID
      envContent += `\nOPENAI_MODEL=${modelId}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated .env file with the new model ID: ${modelId}`);
  } catch (error) {
    console.error('Error updating .env file:', error.message);
  }
}

async function main() {
  try {
    const command = process.argv[2];
    
    if (command === 'upload') {
      const fileId = await uploadFile();
      console.log(`To start fine-tuning: node ${path.basename(__filename)} finetune ${fileId}`);
    } else if (command === 'finetune' && process.argv[3]) {
      const fileId = process.argv[3];
      const jobId = await createFineTuningJob(fileId);
      console.log(`To check status: node ${path.basename(__filename)} status ${jobId}`);
    } else if (command === 'status' && process.argv[3]) {
      const jobId = process.argv[3];
      await checkFineTuningStatus(jobId);
    } else {
      console.log('Usage:');
      console.log(`  node ${path.basename(__filename)} upload`);
      console.log(`  node ${path.basename(__filename)} finetune <file_id>`);
      console.log(`  node ${path.basename(__filename)} status <job_id>`);
    }
  } catch (error) {
    console.error('Error in main function:', error.message);
  }
}

main(); 