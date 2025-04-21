// utils/transcribeAudioGemini.js
import axios from "axios";

/**
 * 将 ArrayBuffer 转成 base64 字符串（兼容大文件）
 */
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const transcribeAudioGemini = async (file, apiKey) => {
  const fileBytes = await file.arrayBuffer();
  const base64Audio = arrayBufferToBase64(fileBytes);

  const prompt = `
You should:
1. Identify the main topic and subtopics.
2. Summarize the content in 3-5 bullet points.
3. Evaluate the tone (e.g., positive, negative, neutral).
4. categorize all harmful content it may contain (eg.Hate Speech, Misinformation, Discrimination,Fearmongering, Others (if applicable))，For each type of harmful content, estimate its proportion in the article as a percentage (e.g., based on sentence or paragraph frequency).
  If a category is not found, set its percentage to 0.
  Please return the result in structured JSON format as follows:
  {
  "Hate Speech": 15,
  "Misinformation": 35,
  "Discrimination": 0,
  "Fearmongering": 25,
  "Incitement to Violence": 0,
  "Propaganda": 15,
  "Other": 10
}
5. Provide suggestions for improving the clarity or neutrality of the content (if needed).
6. Please assess the level of harmful content in the following news article on a scale from 1 (safe) to 10 (extremely harmful). Provide your rating and a brief explanation for your decision.
  Return in the following format: 
  {"risk_score": 8,
  "reason": "Contains racial slurs and promotes group hostility."}
7. Please extract the 20 most frequently mentioned meaningful words from the following news article. Return them in a structured JSON array, in the format:
  [{"word": "政府", "count": 17}, {"word": "民众", "count": 12}, ...]
  Do not include meaningless stopwords, focus on content-related keywords (nouns, verbs, or named entities). Do not output any explanation — only the JSON array.

`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: file.type || "audio/mpeg",
              data: base64Audio
            }
          }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`,
      body,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      source: "audio",
      text_snippet: "[音频内容摘要]",
      raw_text: text
    };
  } catch (error) {
    console.error("Gemini 音频分析失败:", error);
    throw new Error("Gemini 分析失败");
  }
};
