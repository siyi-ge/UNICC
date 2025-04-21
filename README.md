#  UNICC Media Analysis Tool

This project is a lightweight and modular content analysis tool that allows users to upload **text**, **audio**, or **video** files and receive insightful analyses powered by a combination of:

-  Fine-tuned models (e.g., for hate speech classification)
-  OpenAI GPT (for emotion analysis, summaries, moderation suggestions)
-  Whisper (for automatic speech transcription from audio/video)

---

## 🚀 Features

- **Multimodal Upload**: Analyze `.txt`, `.mp3`, or `.mp4` files through an intuitive interface
- **Fine-Tuned Labeling**: Leverages custom-trained models to detect content labels (e.g. hate speech)
- **GPT Analysis**: Offers emotion detection, keyword extraction, summarization, and moderation advice
- **Audio/Video Support**: Automatically transcribes audio and video with Whisper before analysis
- **Responsive Frontend**: Built with React and Chart.js for clean, clear visualization

---

## 🛠️ Tech Stack

| Layer       | Tech                            |
|-------------|----------------------------------|
| Frontend    | React, Chart.js, Tailwind  |
| Backend     | FastAPI, Python, Whisper, Transformers |
| AI Models   | OpenAI GPT-3.5, Fine-tuned Hugging Face models |
| Transcription | OpenAI Whisper                 |
| Deployment  | Localhost or any cloud provider |

---

 Directory Structure
UNICC-MediaAnalysisTool/
├── backend/
│   ├── main.py                # FastAPI backend
│   ├── call_huggingface_text.py  # Hugging Face model logic
│   └── ...
├── frontend/
│   ├── src/App.js            # React app core
│   └── ...
└── README.md

## 📦 Local Setup

###  Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Make sure ffmpeg is installed for Whisper to work:

```bash
brew install ffmpeg  # on macOS
```


###  Frontend

```bash
cd frontend
npm install
npm start
```

🔐 Environment Variables
To run this project securely, create a `.env` file in the **backend** directory with the following content:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_APPLICATION_CREDENTIALS=backend/your-service-account.json
```

Then load it in your Python code using:

```bash
from dotenv import load_dotenv
import os

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")
google_cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
```

🔐 Do NOT commit your .env file or service account .json to GitHub. Use .gitignore to prevent sensitive data from leaking.

📄 License
MIT License – for academic and non-commercial use. Please cite if used in research.

🙌 Credits
Developed by NYU students & UNICC Project

