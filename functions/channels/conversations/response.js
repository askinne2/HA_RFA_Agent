const {
  verifyRequest,
  readConversationAttributes,
} = require(Runtime.getAssets()["/utils.js"].path);

/**
 * @param {import('@twilio-labs/serverless-runtime-types/types').Context} context
 * @param {{}} event
 * @param {import('@twilio-labs/serverless-runtime-types/types').ServerlessCallback} callback
 */
exports.handler = async function (context, event, callback) {
  try {
    if (!verifyRequest(context, event)) {
      return callback(new Error("Invalid token"));
    }
    console.log("response", event);
    
    // Default to rfa_agent for WordPress integration
    const assistantIdentity =
      typeof event._assistantIdentity === "string"
        ? event._assistantIdentity
        : "rfa_agent";

    if (event.Status === "Failed") {
      console.error(event);
      return callback(
        new Error("Failed to generate response. Check error logs.")
      );
    }

    const client = context.getTwilioClient();
    
    // Parse session ID correctly - it could come in different formats
    let serviceSid, conversationsSid;
    
    if (event.SessionId.includes("conversations__")) {
      [serviceSid, conversationsSid] = event.SessionId.replace(
        "conversations__",
        ""
      ).split("/");
    } else if (event.SessionId.includes("webhook:conversations__")) {
      [serviceSid, conversationsSid] = event.SessionId.replace(
        "webhook:conversations__",
        ""
      ).split("/");
    } else {
      console.error("Invalid session ID format:", event.SessionId);
      return callback(new Error("Invalid session ID format"));
    }
    
    const body = event.Body;

    const attributes = await readConversationAttributes(
      context,
      serviceSid,
      conversationsSid
    );
    await client.conversations.v1
      .services(serviceSid)
      .conversations(conversationsSid)
      .update({
        attributes: JSON.stringify({ ...attributes, assistantIsTyping: false }),
      });

    console.log(`Sending message as ${assistantIdentity} to conversation ${conversationsSid}`);
    
    const message = await client.conversations.v1
      .services(serviceSid)
      .conversations(conversationsSid)
      .messages.create({
        body,
        author: assistantIdentity,
      });

    console.log(`Conversation message sent ${message.sid}`);

    return callback(null, {});
  } catch (err) {
    console.error(err);
    return callback(null, {});
  }
};
