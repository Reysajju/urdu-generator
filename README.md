# Synthetic Urdu Data Generator

This tool generates synthetic Urdu reasoning data using the GLM-4.7-Flash API (ZhipuAI).

## Setup
1. Open `.env` and paste your API Key:
   ```
   GLM_API_KEY=your_actual_api_key_here
   ```

## Usage
To run the server using the portable Node.js version provided:

```powershell
& "C:\Users\sajjad.rasool\Downloads\node-v25.2.1-win-x64\node.exe" index.js
```

The server will:
1. Start at `http://localhost:3000`.
2. Provide a web interface to generate and view synthetic Urdu data.
3. Automatically handle fallback between GLM-4.7 and Flash models.
4. Save everything to `dataset.json`.

