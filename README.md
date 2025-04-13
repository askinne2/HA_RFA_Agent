# 🤖 HA Request Line AI Assistant

A bilingual, AI-powered SMS assistant designed to support the Hispanic Alliance of South Carolina by streamlining community requests for assistance through natural language understanding and automated resource matching.

## 📝 Project Overview

This project is a Twilio Serverless application that provides an AI-powered SMS assistant to:
- Understand inquiries related to housing, education, healthcare, and more
- Provide relevant information and resources from a curated knowledge base
- Escalate complex or unclear requests to human agents when necessary
- Support bilingual interactions in English and Spanish

By leveraging Twilio Serverless Functions and OpenAI's language models through LangChain, the assistant enhances accessibility and responsiveness for community support services.

## �� Table of Contents
- Features
- Tech Stack
- Project Structure
- Getting Started
- Usage
- Training the AI Assistant
- Contributing
- License
- Acknowledgments

## ✨ Features

- **Bilingual Support**: Handles interactions in both English and Spanish
- **Intent Recognition**: Identifies user needs such as housing assistance or ESL classes
- **Resource Matching**: Retrieves information from a structured knowledge base
- **Fallback Mechanism**: Routes complex queries to human agents when required
- **Serverless Architecture**: Deployed on Twilio's serverless infrastructure

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **AI Integration**: LangChain with OpenAI GPT-4
- **SMS Integration**: Twilio Serverless Functions
- **Development Tools**: Cursor (AI-enhanced IDE), ngrok for local testing

## 📁 Project Structure

```
HA_RFA_Agent/
├── src/                          # All source code
│   ├── functions/                # Twilio Serverless Functions
│   │   ├── channels/            # Channel-specific handlers
│   │   └── tools/              # Utility functions
│   ├── resources/               # Resource management
│   │   ├── matchers/           # Resource matching algorithms
│   │   └── processors/         # Resource data processors
│   ├── ai/                      # AI-related code
│   │   ├── prompts/            # LLM prompts
│   │   ├── models/             # Model definitions
│   │   └── finetuning/         # Fine-tuning scripts
│   └── utils/                   # Shared utilities
├── assets/                      # Static assets and frontend
│   ├── images/                  # Image assets
│   ├── js/                      # Frontend JavaScript
│   └── css/                     # Stylesheets
├── data/                        # Data files
│   ├── resources/              # Resource data files
│   ├── training/               # Training data
│   └── raw/                    # Raw data files
├── docs/                        # Documentation
│   ├── api/                    # API documentation
│   ├── development/            # Developer guides
│   └── user/                   # User documentation
├── tests/                       # Testing
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── fixtures/               # Test fixtures
├── scripts/                     # Utility scripts
│   ├── deployment/             # Deployment scripts
│   └── data/                   # Data processing scripts
├── config/                      # Configuration files
└── node_modules/                # Dependencies
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- Twilio Account with a verified phone number
- OpenAI API Key
- ngrok for local webhook testing

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/ha-request-line-assistant.git
   cd ha-request-line-assistant
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy the example environment file and add your credentials:
   ```bash
   cp config/.env.example config/.env
   ```
   
   Edit the `.env` file with your credentials:
   ```
   OPENAI_API_KEY=your_openai_api_key
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

4. **Run the Application Locally**
   ```bash
   npm run dev
   ```

5. **Expose Local Server with ngrok**
   ```bash
   ngrok http 3000
   ```
   Use the generated ngrok URL to set up your Twilio webhook.

## 📱 Usage

Once the application is running and ngrok is set up:

1. **Configure Twilio Webhook**
   - Log in to your Twilio Console
   - Navigate to your phone number settings
   - Set the "Messaging" webhook URL to your ngrok URL followed by `/channels/messaging/incoming`

2. **Interact via SMS**
   - Send an SMS to your Twilio phone number
   - The AI assistant will process the message and respond accordingly

For more detailed usage instructions, see the [user documentation](docs/user/).

## 🧠 Training the AI Assistant

For detailed instructions on training and fine-tuning the assistant, see [docs/development/TRAINING.md](docs/development/TRAINING.md).

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](docs/development/CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License. See [LICENSE](docs/LICENSE) for details.

## 🙏 Acknowledgments

- Hispanic Alliance of South Carolina
- Twilio
- OpenAI
- LangChain
- Cursor