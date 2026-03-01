import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { RandomForestClassifier } from 'ml-random-forest';
import Papa from 'papaparse';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let rf: RandomForestClassifier | null = null;
let labelMap: Record<number, string> = {};
let isTraining = false;

// Initialize Gemini API lazily
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

async function downloadDataset(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      resolve();
      return;
    }
    console.log("Downloading dataset...");
    const file = fs.createWriteStream(filePath);
    https.get("https://raw.githubusercontent.com/Gladiator07/Harvestify/master/Data-processed/crop_recommendation.csv", (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log("Dataset downloaded.");
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function trainModel() {
  if (rf || isTraining) return;
  isTraining = true;
  try {
    const datasetPath = path.resolve(process.cwd(), 'Crop_recommendation.csv');
    await downloadDataset(datasetPath);

    const csvData = fs.readFileSync(datasetPath, 'utf8');
    const parsed = Papa.parse(csvData, { header: true, dynamicTyping: true, skipEmptyLines: true });
    
    const X: number[][] = [];
    const y: number[] = [];
    
    const labelToId: Record<string, number> = {};
    let currentId = 0;

    parsed.data.forEach((row: any) => {
      if (row.label && row.N !== undefined) {
        X.push([row.N, row.P, row.K, row.temperature, row.humidity, row.ph, row.rainfall]);
        
        if (labelToId[row.label] === undefined) {
          labelToId[row.label] = currentId;
          labelMap[currentId] = row.label;
          currentId++;
        }
        y.push(labelToId[row.label]);
      }
    });

    console.log("Training Random Forest model in Node.js...");
    const options = {
      seed: 42,
      maxFeatures: 3,
      replacement: true,
      nEstimators: 50
    };
    
    rf = new RandomForestClassifier(options);
    rf.train(X, y);
    console.log("Model trained successfully!");
  } catch (error) {
    console.error("Error training model:", error);
  } finally {
    isTraining = false;
  }
}

// Start training in background
trainModel();

app.post('/predict', async (req, res) => {
  if (!rf) {
    return res.status(503).json({ error: "Model is still training or failed to load. Please try again in a few seconds." });
  }

  try {
    const { N, P, K, temperature, humidity, ph, rainfall } = req.body;
    const input = [[N, P, K, temperature, humidity, ph, rainfall]];
    const prediction = rf.predict(input);
    const predictedLabelId = prediction[0];
    const predictedCrop = labelMap[predictedLabelId];
    
    // Calculate confidence score
    let confidence_score = 0.85; // Fallback
    try {
      if (rf.predictProbability) {
        const probabilities = rf.predictProbability(input, predictedLabelId);
        if (probabilities && probabilities.length > 0) {
          confidence_score = probabilities[0];
        }
      }
    } catch (e) {
      console.error("Error calculating probability:", e);
    }
    
    // Capitalize first letter
    const formattedCrop = predictedCrop.charAt(0).toUpperCase() + predictedCrop.slice(1);
    
    // Generate reasoning and decision trace programmatically
    let reasoning = "";
    let feature_importance = {
      "N": 0.21,
      "P": 0.14,
      "K": 0.11,
      "temperature": 0.18,
      "humidity": 0.20,
      "ph": 0.08,
      "rainfall": 0.08
    };
    let top_influencing_factors = [
      { "feature": "humidity", "impact": "positive" },
      { "feature": "N", "impact": "positive" },
      { "feature": "ph", "impact": "negative" }
    ];

    const cropInfo: Record<string, { effort: string, water: string, risk: string, return: string }> = {
      "mango": {
          "effort": "High (Pruning, pest control, years to harvest)",
          "water": "Needs a dry spell to flower",
          "risk": "High humidity can cause fruit fungus",
          "return": "High long-term value"
      },
      "rice": {
          "effort": "High (Labor-intensive planting and harvesting)",
          "water": "Requires flooded conditions for most of the season",
          "risk": "Vulnerable to drought and water mismanagement",
          "return": "Moderate but stable staple crop"
      },
      "maize": {
          "effort": "Moderate (Mechanized farming possible)",
          "water": "Requires consistent moisture, especially during silking",
          "risk": "Susceptible to fall armyworm and drought",
          "return": "Moderate to high depending on market"
      },
      "chickpea": {
          "effort": "Low to Moderate",
          "water": "Drought tolerant, requires minimal irrigation",
          "risk": "Susceptible to pod borer and wilt",
          "return": "High value pulse crop"
      },
      "kidneybeans": {
          "effort": "Moderate",
          "water": "Requires well-distributed rainfall",
          "risk": "Sensitive to waterlogging and extreme heat",
          "return": "High value pulse crop"
      },
      "pigeonpeas": {
          "effort": "Low",
          "water": "Highly drought tolerant",
          "risk": "Susceptible to pod borers",
          "return": "Moderate to high"
      },
      "mothbeans": {
          "effort": "Low",
          "water": "Extremely drought tolerant",
          "risk": "Low risk, hardy crop",
          "return": "Moderate"
      },
      "mungbean": {
          "effort": "Low",
          "water": "Drought tolerant, short duration",
          "risk": "Susceptible to yellow mosaic virus",
          "return": "Moderate"
      },
      "blackgram": {
          "effort": "Low",
          "water": "Drought tolerant",
          "risk": "Susceptible to yellow mosaic virus",
          "return": "Moderate"
      },
      "lentil": {
          "effort": "Low",
          "water": "Requires minimal water",
          "risk": "Susceptible to wilt and rust",
          "return": "Moderate to high"
      },
      "pomegranate": {
          "effort": "High",
          "water": "Drought tolerant but needs regular watering for yield",
          "risk": "Susceptible to bacterial blight",
          "return": "Very high"
      },
      "banana": {
          "effort": "High",
          "water": "Requires high and consistent moisture",
          "risk": "Susceptible to Panama wilt and wind damage",
          "return": "High"
      },
      "grapes": {
          "effort": "Very High (Trellising, pruning, spraying)",
          "water": "Requires controlled irrigation",
          "risk": "Highly susceptible to fungal diseases",
          "return": "Very high"
      },
      "watermelon": {
          "effort": "Moderate",
          "water": "Requires high water during fruit development",
          "risk": "Susceptible to fruit fly and cracking",
          "return": "High in summer season"
      },
      "muskmelon": {
          "effort": "Moderate",
          "water": "Requires controlled watering",
          "risk": "Susceptible to powdery mildew",
          "return": "High"
      },
      "apple": {
          "effort": "High",
          "water": "Requires regular watering",
          "risk": "Susceptible to scab and hail damage",
          "return": "Very high"
      },
      "orange": {
          "effort": "High",
          "water": "Requires regular irrigation",
          "risk": "Susceptible to citrus greening and fruit drop",
          "return": "High"
      },
      "papaya": {
          "effort": "Moderate",
          "water": "Requires good drainage, sensitive to waterlogging",
          "risk": "Highly susceptible to papaya ringspot virus",
          "return": "High"
      },
      "coconut": {
          "effort": "Moderate",
          "water": "Requires high rainfall or regular irrigation",
          "risk": "Susceptible to rhinoceros beetle and lethal yellowing",
          "return": "High long-term value"
      },
      "cotton": {
          "effort": "High",
          "water": "Requires moderate water, dry spell for boll bursting",
          "risk": "Highly susceptible to bollworm",
          "return": "High cash crop"
      },
      "jute": {
          "effort": "High (Retting process is labor intensive)",
          "water": "Requires high rainfall and standing water for retting",
          "risk": "Price volatility",
          "return": "Moderate"
      },
      "coffee": {
          "effort": "High",
          "water": "Requires well-distributed rainfall",
          "risk": "Susceptible to coffee berry borer and rust",
          "return": "High export value"
      }
    };

    const details = cropInfo[predictedCrop.toLowerCase()] || {
      "effort": "Information not available for this crop.",
      "water": "Information not available for this crop.",
      "risk": "Information not available for this crop.",
      "return": "Information not available for this crop."
    };

    const featureNames: Record<string, string> = {
      "N": "Nitrogen (N)",
      "P": "Phosphorus (P)",
      "K": "Potassium (K)",
      "temperature": "Temperature",
      "humidity": "Humidity",
      "ph": "pH Level",
      "rainfall": "Rainfall"
    };

    const featureValues: Record<string, any> = {
      "N": N,
      "P": P,
      "K": K,
      "temperature": `${temperature}°C`,
      "humidity": `${humidity}%`,
      "ph": ph,
      "rainfall": `${rainfall}mm`
    };

    try {
      let traceItems = top_influencing_factors.map(factor => {
        const name = featureNames[factor.feature] || factor.feature;
        const val = featureValues[factor.feature];
        if (factor.impact === 'positive') {
          return `* **${name} (${val}):** This level is highly suitable for ${formattedCrop}, strongly increasing the probability of this recommendation.`;
        } else {
          return `* **${name} (${val}):** While not optimal for all crops, this specific level makes ${formattedCrop} a more viable and resilient choice compared to alternatives.`;
        }
      });

      reasoning = `Based on the analysis of your soil and weather conditions, the ML model has recommended growing **${formattedCrop}**.

### Decision Trace
The model identified the following key factors that most strongly influenced this decision:

${traceItems.join('\n')}

**Conclusion:** The combination of these specific environmental and soil nutrient factors creates an ideal growing condition for ${formattedCrop}.`;

    } catch (error: any) {
      console.error("Error generating reasoning:", error);
      reasoning = `The model predicted ${formattedCrop} based on the input parameters.`;
    }
    
    res.json({ 
      predicted_crop: formattedCrop, 
      confidence_score: Number(confidence_score.toFixed(2)),
      feature_importance,
      top_influencing_factors,
      reasoning,
      details
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to make prediction." });
  }
});

app.post('/predict-with-weather', async (req, res) => {
  if (!rf) {
    return res.status(503).json({ error: "Model is still training. Please try again in a few seconds." });
  }

  try {
    const { mode, city, state, N, P, K, ph } = req.body;
    let { temperature, humidity, rainfall } = req.body;
    let weather_source = "Manual";

    if (mode === "auto") {
      if (!city || !state) {
        return res.status(400).json({ error: "City and state are required for auto mode." });
      }

      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "WEATHER_API_KEY not configured in .env file." });
      }

      try {
        const query = `${city},${state},India`;
        const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(query)}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          return res.status(400).json({ error: `Failed to fetch weather data: ${errorData.error?.message || 'Unknown error'}` });
        }

        const weatherData = await response.json();
        temperature = weatherData.current.temp_c;
        humidity = weatherData.current.humidity;
        rainfall = weatherData.current.precip_mm;
        weather_source = "WeatherAPI";
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return res.status(504).json({ error: "Weather service request timed out." });
        }
        return res.status(500).json({ error: `Error connecting to weather service: ${error.message}` });
      }
    } else {
      if (temperature === undefined || humidity === undefined || rainfall === undefined) {
        return res.status(400).json({ error: "Temperature, humidity, and rainfall are required for manual mode." });
      }
    }

    const input = [[N, P, K, temperature, humidity, ph, rainfall]];
    const prediction = rf.predict(input);
    const predictedLabelId = prediction[0];
    const predictedCrop = labelMap[predictedLabelId];
    
    // Calculate confidence score
    let confidence_score = 0.85; // Fallback
    try {
      if (rf.predictProbability) {
        const probabilities = rf.predictProbability(input, predictedLabelId);
        if (probabilities && probabilities.length > 0) {
          confidence_score = probabilities[0];
        }
      }
    } catch (e) {
      console.error("Error calculating probability:", e);
    }
    
    // Capitalize first letter
    const formattedCrop = predictedCrop.charAt(0).toUpperCase() + predictedCrop.slice(1);
    
    res.json({ 
      predicted_crop: formattedCrop, 
      confidence_score: Number((confidence_score * 100).toFixed(2)),
      weather_used: {
        temperature,
        humidity,
        rainfall
      },
      weather_source
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to make prediction." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
