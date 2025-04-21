import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import SimpleWordCloud from "./components/SimpleWordCloud";
import EmotionPieChart from "./components/EmotionPieChart";
import ModerationRadarChart from "./components/ModerationRadarChart";




function App() {
  // 所有 useState
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState("text");
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [gptChartData, setGptChartData] = useState(null);


  const [gptText, setGptText] = useState(""); //调用gpt做详细分析
  const [gptAudio, setGptAudio] = useState("");
  const [gptVideo, setGptVideo] = useState("");


  const textFileRef = useRef(null);
  const videoFileRef = useRef(null);
  const audioFileRef = useRef(null);

  const cardStyle = {
    marginTop: "1rem",
    padding: "1rem",
    background: "#e7f3ff",
    borderRadius: "8px",
    border: "1px solid #b3d4fc",
    whiteSpace: "pre-wrap"
  };

    //调用gpt做交叉验证+详细分析
    const callGptAnalysis = async (text, type) => {
      if (!apiKey || !text) return;
    
      const prompt = `Please analyze the following text from the following aspects:
    1. Emotion type (e.g., anger, sadness, neutral)
    2. Keywords
    3. Content summary
    4. Moderation suggestion
    
    Text:
    ${text}`;
    
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          }),
        });
    
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "⚠️ GPT analysis failed";
    
        // 🎯 根据类型更新对应的分析结果
        if (type === "text") setGptText(content);
        else if (type === "audio") setGptAudio(content);
        else if (type === "video") setGptVideo(content);
      } catch (error) {
        console.error("GPT request error:", error);

        if (type === "text") setGptText("❌ GPT error");
        else if (type === "audio") setGptAudio("❌ GPT error");
        else if (type === "video") setGptVideo("❌ GPT error");
      }
    };
      //调用gpt做交叉验证+详细分析此处结束
      

      //调用gpt做可视化图表
      const callGptChart = async (text, type) => {
        if (!apiKey || !text) return;
      
        const prompt = `Please analyze the following text and respond strictly in this JSON format:
        {
          "summary": "A brief summary of the content...",
          "emotion_distribution": {
            "anger": 0~1,
            "sadness": 0~1,
            "neutral": 0~1
          },
          "keywords": [
            { "text": "keyword1", "value": number },
            { "text": "keyword2", "value": number },
            ...
          ],
          "moderation_scores": {
          "<category_name>": <score between 0 and 1>,
          ...
        },
        "notes": "If applicable, group rare types under 'others'. Include granular harmful types like 'political_bias', 'hate_speech', 'misinformation', etc., only if present in the text."
      }
        }


        Text:
        ${text}`;

          try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
              }),
            });
          
            const data = await response.json();
            const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
            setGptChartData(parsed); // 存入状态变量
          } catch (error) {
            console.error("GPT chart error:", error);
          }
        };

      //调用gpt做可视化图表结束


  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) setApiKey(savedApiKey);
  }, []);

  const saveApiKey = () => {
    localStorage.setItem("openai_api_key", apiKey);
    setShowConfig(false);
  };


  const handleFileUpload = async (fileInputRef, type) => {
    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files.length) {
      alert("请先选择文件");
      return;
    }
    if (!apiKey) {
      alert("请先设置API密钥");
      setShowConfig(true);
      return;
    }

  //调用fine-tuning模型分析
    const file = fileInput.files[0];
    setLoading(true);
    setError(null);

    try {
      //音频分析
      if (type === "audio") {
        const formData = new FormData();
        formData.append("file", file);
      
        try {
          const response = await axios.post("http://127.0.0.1:8000/analyze/Whisper", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          
          // 提取后端转录返回数据
          const transcript = response.data?.transcript || "";
          const label = response.data?.label || "unknown";
          const perspective = response.data?.perspective_summary || {};
          const sentenceDetails = response.data?.sentence_analysis || [];

          
          //展示 Fine-tuning 结果
          setResults([...results, {
            source: "audio",
            text_snippet: transcript.slice(0, 50) + "...",
            raw_text: `Label: ${label}\n\nTranscript:\n${transcript}`
          }]);          

          // 详细的毒性分析结构
          const detailText = sentenceDetails.map((item, i) => {
            const scores = item.toxicity_scores;
            const formattedScores = scores
              ? Object.entries(scores).map(([k, v]) => `  ${k}: ${(v.summaryScore.value * 100).toFixed(1)}%`).join("\n")
              : "  无评分";

            return `🎯 句子 ${i + 1}:\n"${item.sentence}"\nGemini 判断: ${item.gemini_label}\nPerspective:\n${formattedScores}`;
          }).join("\n\n");

          setGptAudio(detailText);  // Gemini + Perspective 结构
          
          
          //GPT分析结果展示* 仅当 transcript 有值时再调用 GPT 分析
          if (transcript.trim() !== "") {
            callGptAnalysis(transcript, "audio"); //GPT分析结果可视化*
            callGptChart(transcript, "audio");
          } else {
            setGptAudio("⚠️ 音频未能成功转录，因此 GPT 分析未执行。");
          }
      
          fileInputRef.current.value = "";
          return; 
          //GPT分析结果展示*

          
        } catch (err) {
          setError("Audio Analyze Fail：" + (err.response?.data?.detail || err.message));
          setLoading(false);
          return;
        }
      }
      
      const fileContent = await readFileContent(file);


      //视频分析fine tuning model
      if (type === "video") {
        const formData = new FormData();
        formData.append("file", file);
      
        try {
          const response = await axios.post("http://localhost:8000/analyze/video", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          
          const data = response.data; // data.label + data.texts（数组）
          
          const mergedText = data.texts.join("\n\n");
          
          setResults([
            ...results,
            {
              source: "video",
              text_snippet: data.label, // 只展示结果标签
              raw_text: `Label: ${data.label}`
            }
          ]);
      
          // 调用 GPT 模块处理
          callGptAnalysis(mergedText, "video");
          callGptChart(mergedText, "video");
      
          fileInputRef.current.value = "";
          return;
        } catch (err) {
          setError("视频分析失败：" + (err.response?.data?.error || err.message));
          setLoading(false);
          return;
        }
      }
      
      //文本分析
      if (type === "text") {
        const fileContent = await readFileContent(file);
      
        try {
          const response = await axios.post(
            "http://127.0.0.1:8000/analyze/fine-tuned",
            { text: fileContent },
            { headers: { "Content-Type": "application/json" } }
          );
      
          const { label } = response.data;
      
          setResults([
            ...results,
            {
              source: type,
              text_snippet: fileContent.substring(0, 50) + "...",
              raw_text: `Label: ${label}`
            }
          ]);

          //GPT分析结果展示*
          callGptAnalysis(fileContent, "text");
          //GPT分析结果展示*

          //GPT分析结果可视化*
          callGptChart(fileContent, "text");
          //GPT分析结果可视化*

        } catch (error) {
          setError(`Text Analyze fail: ${error.message}`);
        }

      
        fileInputRef.current.value = "";
        return;
      }
          
  

      fileInputRef.current.value = "";
    } catch (error) {
      console.error("分析失败:", error);
      setError(`分析失败: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith("text/")) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      } else {
        resolve(`[${file.name}] - 文件内容无法直接读取`);
      }
    });
  };

  //分析到此处结束
  
  const fileTypeButtonStyle = (active) => ({
    padding: "0.5rem 1rem",
    margin: "0 0.5rem 1rem 0",
    fontSize: "16px",
    backgroundColor: active ? "#4f46e5" : "#e5e7eb",
    color: active ? "white" : "black",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  });

  const uploadButtonStyle = {
    marginTop: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "16px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  };

  const fileInputContainerStyle = {
    marginTop: "1rem",
    padding: "1.5rem",
    border: "2px dashed #d1d5db",
    borderRadius: "8px",
    textAlign: "center"
  };

  const configPanelStyle = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    padding: "2rem",
    backgroundColor: "white",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    borderRadius: "8px",
    zIndex: 1000,
    width: "80%",
    maxWidth: "500px"
  };


  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>🧠 Media Analysis Tool</h1>
      <div style={{ marginBottom: "1rem", textAlign: "right" }}>
        <button
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: apiKey ? "#10b981" : "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
          onClick={() => setShowConfig(true)}
        >
          {apiKey ? "✓ API configured" : "⚙️ Configure your API"}
        </button>
      </div>

      {showConfig && (
        <div style={configPanelStyle}>
          <h2>Configure your API</h2>
          <p>Please input your OpenAI API keys：</p>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{
              width: "100%",
              padding: "0.5rem",
              marginBottom: "1rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px"
            }}
          />
          <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          Your API key will be saved in your local browser and will not be sent to our server.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#e5e7eb",
                color: "black",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={() => setShowConfig(false)}
            >
              取消
            </button>
            <button
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={saveApiKey}
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <button style={fileTypeButtonStyle(fileType === "text")} onClick={() => setFileType("text")}>📝 Text File</button>
        <button style={fileTypeButtonStyle(fileType === "video")} onClick={() => setFileType("video")}>🎬 Video FIle</button>
        <button style={fileTypeButtonStyle(fileType === "audio")} onClick={() => setFileType("audio")}>🎵 Audio File</button>
      </div>

      <div style={fileInputContainerStyle}>
        {fileType === "text" && (
          <div>
            <h3>Upload Text File</h3>
            <p>Supported Format: .txt</p>
            <input type="file" ref={textFileRef} accept=".txt,.doc,.docx,.pdf" style={{ display: "block", margin: "1rem auto" }} />
            <button style={uploadButtonStyle} onClick={() => handleFileUpload(textFileRef, "text")} disabled={loading}>
              {loading ? "Analyzing..." : "Go"}
            </button>
          </div>
        )}

        {fileType === "video" && (
          <div>
            <h3>Upload Video File</h3>
            <p>Supported Format: .mp4</p>
            <input type="file" ref={videoFileRef} accept=".mp4,.avi,.mov,.wmv" style={{ display: "block", margin: "1rem auto" }} />
            <button style={uploadButtonStyle} onClick={() => handleFileUpload(videoFileRef, "video")} disabled={loading}>
              {loading ? "Analyzing..." : "Go"}
            </button>
          </div>
        )}

        {fileType === "audio" && (
          <div>
            <h3>Upload Audio File</h3>
            <p>Supported Format: .mp3</p>
            <input type="file" ref={audioFileRef} accept=".mp3,.wav,.ogg,.m4a" style={{ display: "block", margin: "1rem auto" }} />
            <button style={uploadButtonStyle} onClick={() => handleFileUpload(audioFileRef, "audio")} disabled={loading}>
              {loading ? "Analyzing..." : "Go"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: "1rem",
              padding: "1rem",
              background: "#fff8dc",
              borderRadius: "8px",
              border: "1px solid rgb(245, 240, 113)",
              whiteSpace: "pre-wrap" }}>
          <h3>📝 Fine-tuning Model Analysis：</h3>
          <p>{results[results.length - 1].raw_text}</p>
        </div>
      )}

      {/* GPT交叉检查模块 */}
      {gptText && (
      <div style={cardStyle}>
        <h3>📝 Cross-Check by GPT</h3>
        <p>{gptText}</p>
      </div>
    )}

    {gptAudio && (
      <div style={cardStyle}>
        <h3>Cross-Check by GPT</h3>
        <p>{gptAudio}</p>
      </div>
    )}

    {gptVideo && (
      <div style={cardStyle}>
        <h3>Cross-Check by GPT</h3>
        <p>{gptVideo}</p>
      </div>
    )}

      {/* GPT可视化图表模块 */}
      {gptChartData && (
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "1rem",
        marginTop: "2rem"
      }}>
    
      {/* 1. 内容总结卡片 */}
      <div style={{ background: "#fffbe6", padding: "1rem", borderRadius: "8px" }}>
        <h3>📋 Summary</h3>
        <p>{gptChartData.summary}</p>
      </div>

      {/* 2. 关键词词云 */}
      <div style={{ background: "#e6f7ff", padding: "1rem", borderRadius: "8px" }}>
        <h3>Keywords</h3>
        {Array.isArray(gptChartData?.keywords) && gptChartData.keywords.length > 0 ? (
          <SimpleWordCloud
            words={gptChartData.keywords.map((kw, index) => {
              return typeof kw === "string"
                ? { text: kw, value: 10 }
                : kw;
            })}
          />
        ) : (
          <p>暂无关键词</p>
        )}
      </div>


      {/* 3. 情绪分析饼图 */}
      <div style={{ background: "#f0f0f0", padding: "1rem", borderRadius: "8px" }}>
        <h3>Emotion Distribution</h3>
        {gptChartData?.emotion_distribution &&
        Object.keys(gptChartData.emotion_distribution).length > 0 ? (
          <EmotionPieChart data={gptChartData.emotion_distribution} />
        ) : (
          <p>暂无情绪数据</p>
        )}
      </div>

      {/* 4. 有害内容类型雷达图 */}
      <div style={{ background: "#fbeaea", padding: "1rem", borderRadius: "8px" }}>
        <h3>Moderation Advice</h3>
        {gptChartData?.moderation_scores ? (
          <ModerationRadarChart data={gptChartData.moderation_scores} />
        ) : (
          <p>{gptChartData?.moderation_advice || "暂无建议"}</p>
        )}
      </div>

    </div>
  )}

  </div> 
  ); 
}

export default App;
