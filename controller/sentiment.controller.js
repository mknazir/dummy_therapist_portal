const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

exports.analyzeSentiment = async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!conversation || !Array.isArray(conversation)) {
      return res
        .status(400)
        .json({
          error: "Invalid input format. Conversation should be an array.",
        });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Format conversation for AI analysis
    const conversationText = conversation
      .map((entry) => `${entry.sender}: ${entry.message}`)
      .join("\n");

    // Define the AI prompt for analysis
    const prompt = `
Analyze the following therapy session and provide a JSON response in **strict JSON format** with **no extra text or explanations outside the JSON**. The JSON MUST be parsable by JavaScript's JSON.parse() function.

If information is unavailable or unclear, provide a **plausible estimate** and explain your reasoning within a dedicated "reasoning" field inside the main JSON object. Do not include reasoning within individual JSON objects.

---

### **Required JSON Structure:**  

#### **General Session Analysis**
- "initial_mood": (string) Client's **starting emotional state** (e.g., "Anxious", "Sad", "Hopeful", "Neutral").
- "reason_for_therapy": (string) The **core issue** the client is seeking help for.
- "ratings": (object) **Numerical values (1-10) for session quality**:
  - "client_engagement": (integer) **Client’s participation level**.
  - "therapist_effectiveness": (integer) **Therapist’s responsiveness and supportiveness**.
  - "overall_conversation_quality": (integer) **Overall quality of communication**.

#### **Client Key Issues**
- "main_issues" (array of objects): **Primary concerns**:
  - "issue": (string) **Short title** of the issue.
  - "description": (string) **Detailed explanation** of the concern.

#### **Emotion Trajectory**
- "emotion_trajectory" (object):
  - "stages" (array of objects): **Major emotional shifts** in the session.
    - Each object should contain:
      - "stage": (string) **Phase of the conversation** (e.g., "Beginning", "Mid-Session", "Closing").
      - "emotion": (string) **Dominant emotion** at that stage (e.g., "Neutral", "Anxious", "Frustrated", "Distressed").
      - "explanation": (string) **Why the emotion shifted**, based on specific messages.

#### **Mood Shifts for Graphing**
- "client_mood_per_message": (array of objects) *REQUIRED*: Client mood for *EACH AND EVERY* message in the conversation.  The array *MUST* have the same number of elements as there are client messages in the 'conversation' you provide below.  If a client message's mood is unclear, provide a plausible estimate and explain your reasoning in the main "reasoning" field of the JSON.
  - "message_index": (integer) Index of the message array (starting from 0).
  - "mood_rating": (integer) Client's mood rating for the message (0-10). 0 being the most negative, 10 being the most positive.

#### **Sentiment Analysis**
- "sentiment_distribution" (object):  
  - "positive": (integer) **Percentage of positive sentiment (0-100)**.  
  - "neutral": (integer) **Percentage of neutral sentiment (0-100)**.  
  - "negative": (integer) **Percentage of negative sentiment (0-100)**.  
  - "explanation": (string) **Justification for these percentages**.

#### **Key Growth Areas**
- "key_growth_areas" (array of objects): **Areas of development**:
  - "area": (string) **Focus area for growth** (e.g., "Building Self-Trust & Emotional Regulation").
  - "description": (string) **How this area will help the client progress**.

#### **Critical Trigger Words**
- "critical_trigger_words" (object):
  - "words" (array of strings): **Emotionally significant words or phrases from the conversation**.

#### **Self-Awareness Level**
- "self_awareness_level" (object):
  - "level": (string) **"High", "Moderate", or "Low"**.
  - "explanation": (string) **Assessment of the client’s self-awareness and ability to reflect**.

#### **Therapist Recommendations**
- "therapist_recommendations" (array of objects):  
  - "major_finding": (string) **Key psychological/emotional issue identified**.  
  - "recommendations": (array of strings) **Actionable next steps for the therapist**.  

---

### **Conversation Data:**
${conversationText}
    `;

    // Generate content from Gemini AI
    const result = await model.generateContent(prompt);
    let analysisText = result.response.text();

    // Ensure we properly extract only the JSON output
    analysisText = analysisText.replace(/json|```/g, "").trim();

    try {
      const analysis = JSON.parse(analysisText);
      res.json({ analysis });
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Problematic JSON:", analysisText);
      res
        .status(500)
        .json({
          error: "Error parsing JSON from model response. Check server logs.",
        });
    }
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};