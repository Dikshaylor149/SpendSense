const { GoogleGenerativeAI } = require('@google/generative-ai');

const generateAnomalyInsight = async (anomalies) => {
  // If no anomalies were mathematically detected, don't bother the AI
  if (!anomalies || anomalies.length === 0) {
    return "Spending is within normal statistical ranges.";
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Using the 1.5-flash model because it is the fastest and most cost-effective for text tasks
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Format the raw JSON anomalies into a simple text list for the AI to read
    const anomalyText = anomalies.map(a => `${a.merchant} (${a.category}): ₹${a.amount}`).join(', ');

    // The strict prompt ensuring the AI acts like a data analyst, not a chatbot
    const prompt = `You are a strict, professional financial data analyst. 
    I have mathematically detected the following spending anomalies in the user's recent transactions based on an IQR baseline:
    ${anomalyText}
    
    Write exactly one clear, concise sentence observing these unusual expenses. Do not give financial advice. Do not use conversational filler like "Here is your insight".`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("AI API temporarily unavailable. Using programmatic fallback.");
    
    // Sort anomalies to find the biggest one for our fallback text
    const sortedAnomalies = [...anomalies].sort((a, b) => b.amount - a.amount);
    const topAnomaly = sortedAnomalies[0];
    
    return `An IQR baseline analysis detected ${anomalies.length} spending anomalies, most notably a high-value ₹${topAnomaly.amount} transaction at ${topAnomaly.merchant}.`;
  }
};

module.exports = { generateAnomalyInsight };