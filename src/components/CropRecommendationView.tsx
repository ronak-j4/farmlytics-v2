import React, { useState } from 'react';
import {
  Sprout, AlertTriangle, CheckCircle2,
  Leaf, LineChart as ChartIcon, BrainCircuit, MapPin, ChevronDown, ChevronUp, Thermometer, CloudRain
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import Markdown from 'react-markdown';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CropRecommendationResult {
  location: string;
  climate_summary: string;
  recommended_crop: string;
  alternative_crop: string;
  suitability_score: number;
  risk_level: string;
  decision_trace: { step: string; detail: string }[];
  temperature_data: { date: string; max: number; min: number; crop_max: number; crop_min: number }[];
  rainfall_data: { date: string; amount: number; crop_req: number }[];
  suitability_breakdown: { factor: string; score: number }[];
  reasoning: string;
}

export function CropRecommendationView() {
  const [formData, setFormData] = useState({
    location: '',
    N: 90,
    P: 42,
    K: 43,
    ph: 6.5,
    soil_moisture: 45
  });
  const [result, setResult] = useState<CropRecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedView, setAdvancedView] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location) {
      setError("Please enter a location.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Geocode location
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(formData.location)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("Location not found. Please try a different city name.");
      }
      
      const { latitude, longitude, name, country } = geoData.results[0];
      const resolvedLocation = `${name}, ${country}`;

      // 2. Fetch Forecast Data
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&past_days=7`);
      const weatherData = await weatherRes.json();

      if (!weatherData.daily) {
        throw new Error("Failed to fetch weather data for this location.");
      }

      // 3. Prepare data for Gemini
      const prompt = `
You are an expert agronomist AI. Recommend the best crop based on the following data.

Location: ${resolvedLocation} (Lat: ${latitude}, Lon: ${longitude})
Soil Nutrients: N=${formData.N}, P=${formData.P}, K=${formData.K}, pH=${formData.ph}
Soil Moisture: ${formData.soil_moisture}%

Climate Data (Past 7 days + Next 7 days):
Dates: ${weatherData.daily.time.join(', ')}
Max Temp (°C): ${weatherData.daily.temperature_2m_max.join(', ')}
Min Temp (°C): ${weatherData.daily.temperature_2m_min.join(', ')}
Precipitation (mm): ${weatherData.daily.precipitation_sum.join(', ')}

Analyze the climate suitability, temperature range, rainfall patterns, and soil nutrients.
Generate a Climate Suitability Score (0-100).
Select the best crop and an alternative.
Provide explainable reasoning.

Return the result strictly in the following JSON format:
{
  "location": "${resolvedLocation}",
  "climate_summary": "Short summary of the climate",
  "recommended_crop": "Crop Name",
  "alternative_crop": "Alternative Crop Name",
  "suitability_score": 85,
  "risk_level": "Low / Moderate / High",
  "decision_trace": [
    { "step": "Location received", "detail": "..." },
    { "step": "Climate data fetched", "detail": "..." },
    { "step": "Forecast summary generated", "detail": "..." },
    { "step": "Crop-wise suitability scores calculated", "detail": "..." },
    { "step": "Final crop selected", "detail": "..." }
  ],
  "temperature_data": [
    { "date": "YYYY-MM-DD", "max": 30, "min": 20, "crop_max": 35, "crop_min": 15 }
  ],
  "rainfall_data": [
    { "date": "YYYY-MM-DD", "amount": 5, "crop_req": 4 }
  ],
  "suitability_breakdown": [
    { "factor": "Temperature", "score": 90 },
    { "factor": "Rainfall", "score": 80 },
    { "factor": "Humidity", "score": 85 },
    { "factor": "Soil Nutrients", "score": 75 }
  ],
  "reasoning": "Detailed reasoning here..."
}
`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              location: { type: Type.STRING },
              climate_summary: { type: Type.STRING },
              recommended_crop: { type: Type.STRING },
              alternative_crop: { type: Type.STRING },
              suitability_score: { type: Type.NUMBER },
              risk_level: { type: Type.STRING },
              decision_trace: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step: { type: Type.STRING },
                    detail: { type: Type.STRING }
                  }
                }
              },
              temperature_data: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    max: { type: Type.NUMBER },
                    min: { type: Type.NUMBER },
                    crop_max: { type: Type.NUMBER },
                    crop_min: { type: Type.NUMBER }
                  }
                }
              },
              rainfall_data: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    crop_req: { type: Type.NUMBER }
                  }
                }
              },
              suitability_breakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    factor: { type: Type.STRING },
                    score: { type: Type.NUMBER }
                  }
                }
              },
              reasoning: { type: Type.STRING }
            }
          }
        }
      });

      const jsonStr = response.text?.trim();
      if (!jsonStr) throw new Error("Failed to generate recommendation.");
      
      const parsed = JSON.parse(jsonStr) as CropRecommendationResult;
      setResult(parsed);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'location' ? value : Number(value)
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-emerald-500" />
          Crop Recommendation
        </h1>
        <p className="text-slate-500 mt-1">Predict the best crop for your location, soil, and upcoming weather conditions.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 lg:col-span-1">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3">Input Parameters</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> Location (City or Lat/Lon)</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Nairobi, Kenya" className="w-full rounded-lg border-slate-300 bg-slate-50 border py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Nitrogen (N)</label>
                <input type="number" name="N" value={formData.N} onChange={handleChange} className="w-full rounded-lg border-slate-300 bg-slate-50 border py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Phosphorus (P)</label>
                <input type="number" name="P" value={formData.P} onChange={handleChange} className="w-full rounded-lg border-slate-300 bg-slate-50 border py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Potassium (K)</label>
                <input type="number" name="K" value={formData.K} onChange={handleChange} className="w-full rounded-lg border-slate-300 bg-slate-50 border py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">pH Level</label>
                <input type="number" step="0.1" name="ph" value={formData.ph} onChange={handleChange} className="w-full rounded-lg border-slate-300 bg-slate-50 border py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Soil Moisture (%)</label>
                <input type="number" step="0.1" name="soil_moisture" value={formData.soil_moisture} onChange={handleChange} className="w-full rounded-lg border-slate-300 bg-slate-50 border py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Analyzing Climate & Soil...</span>
            ) : (
              <>
                <BrainCircuit className="w-5 h-5" />
                Predict Best Crop
              </>
            )}
          </button>
        </form>

        <div className="lg:col-span-2 space-y-6">
          {error ? (
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col justify-center min-h-[300px]">
              <div className="text-center animate-in fade-in">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-400 mb-2">Prediction Failed</h3>
                <p className="text-slate-400 text-sm">{error}</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6 animate-in zoom-in duration-300">
              {/* Farmer View */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row gap-6 items-center">
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Recommended Crop</h3>
                  <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 pb-2">
                    {result.recommended_crop}
                  </p>
                  <p className="text-slate-300 mt-2 text-sm">Alternative: <span className="font-semibold text-white">{result.alternative_crop}</span></p>
                  
                  <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-300">
                        {result.suitability_score}% Suitability
                      </span>
                    </div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                      result.risk_level.toLowerCase() === 'low' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                      result.risk_level.toLowerCase() === 'moderate' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' :
                      'bg-red-500/10 border-red-500/20 text-red-300'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {result.risk_level} Risk
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {result.location}
                  </h4>
                  <p className="text-sm text-slate-300 mb-3">{result.climate_summary}</p>
                  <div className="text-sm text-slate-400 border-t border-slate-700 pt-3">
                    <Markdown>{result.reasoning}</Markdown>
                  </div>
                </div>
              </div>

              {/* Advanced View Toggle */}
              <button 
                onClick={() => setAdvancedView(!advancedView)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                <ChartIcon className="w-4 h-4" />
                {advancedView ? 'Hide Advanced Analytics' : 'Show Advanced Analytics'}
                {advancedView ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Advanced View Content */}
              {advancedView && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Temperature Graph */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-500" /> Temperature Forecast vs Crop Needs
                      </h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={result.temperature_data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => val.substring(5)} />
                            <YAxis tick={{fontSize: 10}} />
                            <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                            <Legend wrapperStyle={{fontSize: '10px'}} />
                            <Line type="monotone" dataKey="max" name="Max Temp" stroke="#f97316" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="min" name="Min Temp" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            <Line type="step" dataKey="crop_max" name="Crop Max" stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                            <Line type="step" dataKey="crop_min" name="Crop Min" stroke="#0ea5e9" strokeDasharray="5 5" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Rainfall Graph */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <CloudRain className="w-4 h-4 text-blue-500" /> Rainfall Forecast vs Crop Needs
                      </h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.rainfall_data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => val.substring(5)} />
                            <YAxis tick={{fontSize: 10}} />
                            <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                            <Legend wrapperStyle={{fontSize: '10px'}} />
                            <Bar dataKey="amount" name="Forecast (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="crop_req" name="Required (mm)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Suitability Breakdown */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-4">Suitability Scoring Breakdown</h4>
                      <div className="space-y-3">
                        {result.suitability_breakdown.map((item, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                              <span>{item.factor}</span>
                              <span>{item.score}/100</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  item.score >= 80 ? 'bg-emerald-500' : 
                                  item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`} 
                                style={{ width: `${item.score}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Decision Trace */}
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm text-slate-300">
                      <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4" /> Decision Trace
                      </h4>
                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                        {result.decision_trace.map((trace, idx) => (
                          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border border-emerald-500 bg-slate-900 text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            </div>
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-slate-800/50 p-3 rounded border border-slate-700/50">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-bold text-slate-200 text-xs">{trace.step}</div>
                              </div>
                              <div className="text-slate-400 text-xs">{trace.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col justify-center min-h-[300px]">
              <div className="text-center text-slate-500">
                <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Enter location and parameters, then click predict to see the ML model's recommendation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
