#!/bin/bash

# Migration script to convert old project structure to new structure
# This script should be run from the project root directory

echo "Starting migration to new project structure..."

# Create directory structure
mkdir -p src/functions/channels/messaging src/functions/channels/voice src/functions/channels/conversations src/functions/tools
mkdir -p src/resources/matchers src/resources/processors src/ai/prompts src/ai/models src/ai/finetuning src/utils
mkdir -p assets/images assets/js assets/css
mkdir -p data/resources data/training data/raw
mkdir -p docs/api docs/development docs/user
mkdir -p tests/unit tests/integration tests/fixtures
mkdir -p scripts/deployment scripts/data
mkdir -p config

# Move functions
echo "Moving functions..."
if [ -d "functions" ]; then
  cp -R functions/channels/* src/functions/channels/ 2>/dev/null || :
  cp -R functions/tools/* src/functions/tools/ 2>/dev/null || :
fi

# Move resource matcher files
echo "Moving resource matcher files..."
if [ -f "functions/tools/resourceMatcher.ts" ]; then
  cp functions/tools/resourceMatcher.ts src/resources/matchers/ 2>/dev/null || :
fi

if [ -f "functions/tools/resourceMatcher.test.ts" ]; then
  cp functions/tools/resourceMatcher.test.ts tests/unit/ 2>/dev/null || :
fi

# Move AI files
echo "Moving AI-related files..."
if [ -f "finetune-openai.js" ]; then
  cp finetune-openai.js src/ai/finetuning/ 2>/dev/null || :
fi

# Move documentation
echo "Moving documentation files..."
if [ -d "docs" ]; then
  if [ -f "docs/TRAINING.md" ]; then
    cp docs/TRAINING.md docs/development/ 2>/dev/null || :
  fi
  
  if [ -f "docs/Q&A-chatbot.md" ]; then
    cp docs/Q\&A-chatbot.md docs/user/ 2>/dev/null || :
  fi
  
  if [ -f "docs/enhanced_resource_guide.json" ]; then
    cp docs/enhanced_resource_guide.json data/resources/ 2>/dev/null || :
  fi
  
  if [ -f "docs/ha_resource_guide.json" ]; then
    cp docs/ha_resource_guide.json data/resources/ 2>/dev/null || :
  fi
  
  if [ -f "docs/training-examples.jsonl" ]; then
    cp docs/training-examples.jsonl data/training/ 2>/dev/null || :
  fi
  
  if [ -f "docs/ai-assistants.png" ]; then
    cp docs/ai-assistants.png assets/images/ 2>/dev/null || :
  fi
  
  if [ -f "docs/ai-assistants-light.png" ]; then
    cp docs/ai-assistants-light.png assets/images/ 2>/dev/null || :
  fi
fi

# Move assets
echo "Moving assets..."
if [ -d "assets" ]; then
  if [ -f "assets/utils.private.js" ]; then
    cp assets/utils.private.js src/utils/ 2>/dev/null || :
  fi
fi

# Move config files
echo "Moving configuration files..."
if [ -f ".env" ]; then
  cp .env config/ 2>/dev/null || :
fi

if [ -f ".env.example" ]; then
  cp .env.example config/ 2>/dev/null || :
fi

if [ -f ".twilioserverlessrc" ]; then
  cp .twilioserverlessrc config/ 2>/dev/null || :
fi

if [ -f "tsconfig.json" ]; then
  cp tsconfig.json config/ 2>/dev/null || :
fi

if [ -f ".prettierrc" ]; then
  cp .prettierrc config/ 2>/dev/null || :
fi

# Move scripts
echo "Moving scripts..."
if [ -f "migrate_resources.py" ]; then
  cp migrate_resources.py scripts/data/ 2>/dev/null || :
fi

if [ -f "test_conversation_flow.sh" ]; then
  cp test_conversation_flow.sh scripts/ 2>/dev/null || :
fi

# Move RFA data
echo "Moving RFA data..."
if [ -d "RFA-data" ]; then
  cp -R RFA-data/* data/raw/ 2>/dev/null || :
fi

# Move other documentation
echo "Moving other documentation..."
if [ -f "API-Setup.md" ]; then
  cp API-Setup.md docs/development/ 2>/dev/null || :
fi

if [ -f "ROADMAP.md" ]; then
  cp ROADMAP.md docs/ 2>/dev/null || :
fi

if [ -f "curl_for_HA.md" ]; then
  cp curl_for_HA.md docs/api/ 2>/dev/null || :
fi

if [ -f "curl_examples.md" ]; then
  cp curl_examples.md docs/api/ 2>/dev/null || :
fi

if [ -f "CONTRIBUTING.md" ]; then
  cp CONTRIBUTING.md docs/development/ 2>/dev/null || :
fi

if [ -f "LICENSE" ]; then
  cp LICENSE docs/ 2>/dev/null || :
fi

if [ -f "README-original.md" ]; then
  cp README-original.md docs/ 2>/dev/null || :
fi

if [ -f "kb.json" ]; then
  cp kb.json data/resources/ 2>/dev/null || :
fi

echo "Migration complete!"
echo ""
echo "NOTE: This script makes copies of files to the new structure while keeping the originals."
echo "To complete the migration, update imports in your code to point to the new locations,"
echo "then remove the original files once everything is working correctly."
echo ""
echo "Also make sure to update your npm scripts in package.json to use the new paths." 