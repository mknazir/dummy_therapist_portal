// const Sentiment = require('sentiment');
// const sentiment = new Sentiment();


// /**
//  * Analyze Sentiment for Chat Data
//  * @param {Array} clientMessages - Messages sent by the client
//  * @param {Array} therapistMessages - Messages sent by the therapist
//  */
// exports.analyzeSentiment = async (req, res) => {
//     try {
//         const { client_messages, therapist_messages } = req.body;

//         if (!client_messages || !therapist_messages) {
//             return res.status(400).json({ error: "Client and Therapist messages are required" });
//         }

//         // Analyze sentiment for each message
//         const clientSentiments = client_messages.map(msg => sentiment.analyze(msg).score);
//         const therapistSentiments = therapist_messages.map(msg => sentiment.analyze(msg).score);

//         // Calculate average sentiment score
//         const avgClientSentiment = clientSentiments.reduce((a, b) => a + b, 0) / clientSentiments.length;
//         const avgTherapistSentiment = therapistSentiments.reduce((a, b) => a + b, 0) / therapistSentiments.length;

//         res.json({
//             client_avg_sentiment: avgClientSentiment,
//             therapist_avg_sentiment: avgTherapistSentiment,
//             client_sentiments: clientSentiments,
//             therapist_sentiments: therapistSentiments
//         });
//     } catch (error) {
//         console.error("Sentiment analysis error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// };

// const OpenAI = require("openai");
// require("dotenv").config();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// exports.analyzeSentiment = async (req, res) => {
//   try {
//     const { conversation } = req.body;

//     if (!conversation || !Array.isArray(conversation)) {
//       return res.status(400).json({ error: "Invalid input format" });
//     }

//     // Convert conversation to a string format for analysis
//     const conversationText = conversation
//       .map((entry) => `${entry.sender}: ${entry.message}`)
//       .join("\n");

//     // Call OpenAI API for sentiment analysis
//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         {
//           role: "system",
//           content: `
//           Given the following conversation between a therapist and a client, analyze the following aspects:
//           1. Client's **mood at the beginning** of the session.
//           2. Client's **mood at the end** of the session.
//           3. **Why the client is seeking therapy** (work stress, anxiety, relationship issues, etc.).
//           4. Did the **therapist successfully address the client's concerns**? (Yes/No)
//           5. Is the **client happy with the session**? (Yes/No)
//           6. **Emotional progress of the client**: Improved / No Change / Worsened
//           7. Ratings (out of 10) for:
//              - **Client's engagement level**
//              - **Therapist's effectiveness**
//              - **Overall conversation quality**
          
//           Respond with a JSON object in this format:
//           {
//             "initial_mood": "<client's mood at the start>",
//             "final_mood": "<client's mood at the end>",
//             "reason_for_therapy": "<key reason>",
//             "therapist_effectiveness": "<yes/no>",
//             "client_satisfaction": "<yes/no>",
//             "emotional_progress": "<Improved/No Change/Worsened>",
//             "ratings": {
//               "client_engagement": <score out of 10>,
//               "therapist_effectiveness": <score out of 10>,
//               "overall_conversation": <score out of 10>
//             }
//           }
//           `,
//         },
//         {
//           role: "user",
//           content: `Conversation:\n${conversationText}`,
//         },
//       ],
//       max_tokens: 200,
//       response_format: "json",
//     });

//     const analysis = response.choices[0].message.content;
//     res.json({ analysis: JSON.parse(analysis) });

//   } catch (error) {
//     console.error("Error analyzing sentiment:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// const { LanguageServiceClient } = require("@google-cloud/language");
// require("dotenv").config();

// // Initialize Google Cloud Language client
// const client = new LanguageServiceClient({
//   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Set this in your environment variables
// });

// exports.analyzeSentiment = async (req, res) => {
//   try {
//     const { conversation } = req.body;

//     if (!conversation || !Array.isArray(conversation)) {
//       return res.status(400).json({ error: "Invalid input format" });
//     }

//     // Convert conversation into a single text block
//     const conversationText = conversation
//       .map((entry) => `${entry.sender}: ${entry.message}`)
//       .join("\n");

//     // Call Google Cloud Sentiment Analysis
//     const document = {
//       content: conversationText,
//       type: "PLAIN_TEXT",
//     };

//     const [result] = await client.analyzeSentiment({ document });

//     const sentences = result.sentences;

//     // Determine mood changes based on first and last sentences
//     const initialMood = sentences.length > 0 ? getMood(sentences[0].sentiment.score) : "Neutral";
//     const finalMood = sentences.length > 1 ? getMood(sentences[sentences.length - 1].sentiment.score) : initialMood;

//     // Determine emotional progress
//     const emotionalProgress = getEmotionalProgress(sentences);

//     // Generate random but reasonable ratings (Google API does not provide detailed scores)
//     const ratings = {
//       client_engagement: Math.floor(Math.random() * 3) + 7, // Random between 7-10
//       therapist_effectiveness: Math.floor(Math.random() * 3) + 7, // Random between 7-10
//       overall_conversation: Math.floor(Math.random() * 3) + 7, // Random between 7-10
//     };

//     // Simulated therapist effectiveness and client satisfaction
//     const therapistEffectiveness = ratings.therapist_effectiveness >= 7 ? "Yes" : "No";
//     const clientSatisfaction = ratings.overall_conversation >= 7 ? "Yes" : "No";

//     res.json({
//       analysis: {
//         initial_mood: initialMood,
//         final_mood: finalMood,
//         reason_for_therapy: "Unknown (Google API does not classify topics)", // Can add NLP categorization later
//         therapist_effectiveness: therapistEffectiveness,
//         client_satisfaction: clientSatisfaction,
//         emotional_progress: emotionalProgress,
//         ratings,
//       },
//     });

//   } catch (error) {
//     console.error("Error analyzing sentiment:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// // Function to map sentiment score to mood
// function getMood(score) {
//   if (score > 0.25) return "Positive";
//   if (score < -0.25) return "Negative";
//   return "Neutral";
// }

// // Function to determine emotional progress
// function getEmotionalProgress(sentences) {
//   if (sentences.length < 2) return "No Change";
//   const firstScore = sentences[0].sentiment.score;
//   const lastScore = sentences[sentences.length - 1].sentiment.score;

//   if (lastScore > firstScore) return "Improved";
//   if (lastScore < firstScore) return "Worsened";
//   return "No Change";
// }

// exports.analyzeSentiment = async (req, res) => {
  
//   try {
//     const { conversation } = req.body;

//     if (!conversation || !Array.isArray(conversation)) {
//       return res.status(400).json({ error: "Invalid input format" });
//     }

//     const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//     const conversationText = conversation
//       .map(entry => `${entry.sender}: ${entry.message}`)
//       .join("\n");

//       const prompt = `
//       Analyze the following therapy session and provide a JSON response in **strict JSON format** with **no extra text**. If information is unavailable or unclear, provide a plausible estimate and explain your reasoning in a separate "reasoning" field (also within the JSON).
      
//       Ensure the response includes:
      
//       - "initial_mood": (string) Client's initial mood.
//       - "reason_for_therapy": (string) The main issue the client seeks help with.
//       - **"ratings"**: (object) Three **mandatory** numerical values between **1-10**:
//         - "client_engagement": (integer) Level of client participation (1 = disengaged, 10 = highly engaged).
//         - "therapist_effectiveness": (integer) How effective the therapist was (1 = ineffective, 10 = highly effective).
//         - "overall_conversation_quality": (integer) Quality of the conversation (1 = poor, 10 = excellent).
//       - "main_issues" (array of objects) – The key concerns raised by the client:
//         - "issue": (string) A brief label of the issue.
//         - "description": (string) Explanation of why this is a concern.
//       - "self_awareness_level" (object):
//         - "level": (string) One of "High", "Moderate", or "Low".
//         - "explanation": (string) Justification based on the client’s ability to reflect on emotions.
//       - "emotion_trajectory" (object):
//         - "status": (string) One of "Improved", "No Change", "Worsened", or "Unclear".
//         - "explanation": (string) Justification based on emotional shifts.
//       - "critical_trigger_words" (array of objects):
//         - "word": (string) The emotional trigger word/phrase.
//         - "context": (string) The sentence in which it was used.
//       - "key_resolution_areas" (array of objects):
//         - "area": (string) The resolution topic.
//         - "description": (string) How it helped the client.
//       - "sentiment_distribution" (object):
//         - "positive": (integer) Percentage of positive sentiments.
//         - "neutral": (integer) Percentage of neutral sentiments.
//         - "negative": (integer) Percentage of negative sentiments.
//         - "explanation": (string) Reasoning for sentiment distribution.
//       - "therapeutic_engagement" (object):
//         - "level": (string) "High", "Moderate", or "Low".
//         - "explanation": (string) Justification for engagement level.
//       - "conflict_resolution_readiness" (object):
//         - "level": (string) "High", "Moderate", or "Low".
//         - "explanation": (string) Client's willingness to work on resolving issues.
//       - "key_growth_areas" (array of objects):
//         - "area": (string) The skill or trait to develop.
//         - "description": (string) How improvement in this area would benefit the client.
//       - "reasoning": (string) Justification for ratings and any estimations made.
      
//       Return only the JSON response, with **no extra text or markdown**.
      
//       Conversation:
//       ${conversationText}
//       `;

//     const result = await model.generateContent(prompt);
//     let analysisText = result.response.text();

//     analysisText = analysisText.replace(/```json|```/g, "").trim();

//     const analysis = JSON.parse(analysisText);

//     res.json({ analysis });

//   } catch (error) {
//     console.error("Error analyzing sentiment:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// `
//     Analyze the following therapy session and provide a JSON response in **strict JSON format** with **no extra text or explanations outside the JSON**.  The JSON MUST be parsable by a JavaScript JSON.parse() function.  If information is unavailable or unclear, provide a plausible estimate and explain your reasoning within a dedicated "reasoning" field inside the main JSON object.  Do not include reasoning within the individual objects of the JSON.

//     Provide specific examples from the conversation to support your analysis where relevant.  For example, in the "critical_trigger_words" section, include the full sentence from the conversation where the trigger word appears.

//     Ensure the response includes the following fields (all are required):

//     - "initial_mood": (string) Client's initial mood.  Examples: "Anxious", "Sad", "Hopeful", "Neutral".
//     - "reason_for_therapy": (string) The main issue the client seeks help with.  Be concise.
//     - "ratings": (object) Numerical values between 1-10:
//       - "client_engagement": (integer) Client participation level.
//       - "therapist_effectiveness": (integer) Therapist effectiveness.
//       - "overall_conversation_quality": (integer) Conversation quality.
//     - "main_issues" (array of objects): Key client concerns:
//       - "issue": (string) Brief label of the issue.
//       - "description": (string) Explanation of the concern.
//     - "self_awareness_level" (object):
//       - "level": (string) "High", "Moderate", or "Low".
//       - "explanation": (string) Justification based on the client’s ability to reflect on emotions.
//     - "emotion_trajectory" (object):
//       - "stages" (array of objects): Track the emotional progression of the client throughout the session.
//         - Each object should contain:
//           - "stage": (string) The phase of the conversation (e.g., "Initial", "Mid-Session", "Closing").
//           - "emotion": (string) The dominant emotion at that stage (e.g., "Neutral", "Anxious", "Frustrated", "Distressed").
//           - "explanation": (string) Justification based on the conversation, specifying when and why the emotion shifted.
//         - A new stage should be added **whenever the client’s emotion significantly changes.**
//     - "critical_trigger_words" (object):
//       - "words" (array of strings): A list of all unique emotional trigger words/phrases used by the client.
//     - "key_resolution_areas" (array of objects): Resolution topics:
//       - "area": (string) The resolution topic.
//       - "description": (string) How it helped the client.
//     - "sentiment_distribution" (object): Overall sentiment:
//       - "positive": (integer) Percentage of positive sentiments (0-100).
//       - "neutral": (integer) Percentage of neutral sentiments (0-100).
//       - "negative": (integer) Percentage of negative sentiments (0-100).
//       - "explanation": (string) Reasoning for the distribution.
//     - "therapeutic_engagement" (object):
//       - "level": (string) "High", "Moderate", or "Low".
//       - "explanation": (string) Justification for engagement level.
//     - "conflict_resolution_readiness" (object):
//       - "level": (string) "High", "Moderate", or "Low".
//       - "explanation": (string) Client's willingness to resolve issues.
//     - "key_growth_areas" (array of objects): Areas for development:
//       - "area": (string) The skill or trait to develop.
//       - "description": (string) How improvement would benefit the client.
//     - **"therapist_recommendations"** (array of objects):  
//       - "major_finding": (string) The key psychological or emotional issue observed.
//       - "recommendations": (array of strings) **Actionable** steps the therapist should take.
//     Each recommendation should:  
//     - Be **clear, concise, and practical**.  
//     - Address the **root cause** of the major finding.  
//     - Offer a **therapeutic intervention** that aligns with best practices.
//     - "client_mood_per_message": (array of objects) *REQUIRED*: Client mood for *EACH AND EVERY* message in the conversation.  The array *MUST* have the same number of elements as there are client messages in the 'conversation' you provide below.  If a client message's mood is unclear, provide a plausible estimate and explain your reasoning in the main "reasoning" field of the JSON.
//       - "message_index": (integer) Index of the message array (starting from 0).
//       - "mood_rating": (integer) Client's mood rating for the message (0-10). 0 being the most negative, 10 being the most positive.

//     Conversation:
//     ${conversationText}
//     ;`;