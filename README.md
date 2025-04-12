# 🤖 HA Request Line AI Assistant

A bilingual, AI-powered SMS assistant designed to support the Hispanic Alliance of South Carolina by streamlining community requests for assistance through natural language understanding and automated resource matching.

## 📝 Project Overview

This project is a Twilio Serverless application that provides an AI-powered SMS assistant to:
- Understand inquiries related to housing, education, healthcare, and more
- Provide relevant information and resources from a curated knowledge base
- Escalate complex or unclear requests to human agents when necessary

By leveraging Twilio Serverless Functions and OpenAI's language models through LangChain, the assistant enhances accessibility and responsiveness for community support services.

## �� Table of Contents
	•	Features
	•	Tech Stack
	•	Getting Started
	•	Usage
	•	Project Structure
	•	Contributing
	•	License
	•	Acknowledgments

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
   Create a `.env` file in the root directory and add your credentials:
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

## 📁 Project Structure

```
ha-request-line-assistant/
├── functions/                # Twilio Serverless Functions
│   ├── channels/            # Channel-specific handlers
│   │   ├── messaging/      # SMS message handling
│   │   ├── voice/         # Voice call handling
│   │   └── conversations/ # Chat handling
│   └── tools/              # Utility functions
├── assets/                  # Static assets
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript configuration
├── .env                    # Environment variables
└── README.md              # Project documentation
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**
2. **Create a New Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit Your Changes**
   ```bash
   git commit -m "Add your message here"
   ```
4. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Submit a Pull Request**

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Hispanic Alliance of South Carolina
- Twilio
- OpenAI
- LangChain
- Cursor

Feel free to customize this template further to match your project's specifics. Let me know if you need assistance with any section!