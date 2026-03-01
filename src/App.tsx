import React, { useState, useMemo, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  Sprout, Droplets, Thermometer, CloudRain, AlertTriangle, CheckCircle2,
  History, PlusCircle, LayoutDashboard, LineChart as ChartIcon, Bell,
  Menu, X, Leaf, Activity, Beaker, Wind, BrainCircuit, MapPin, ChevronDown, ChevronUp
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

import { CropRecommendationView } from './components/CropRecommendationView';

type CropType = string;

interface CropConfig {
  name: string;
  rootDepth: number;
  moistureMin: number;
  moistureMax: number;
  criticalMoisture: number;
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
  phMin: number;
  phMax: number;
  nMin: number;
  nMax: number;
  pMin: number;
  pMax: number;
  kMin: number;
  kMax: number;
  recommendedMethod: string;
}

const CROP_DATA: Record<string, CropConfig> = {
  Wheat: { name: 'Wheat', rootDepth: 0.4, moistureMin: 40, moistureMax: 60, criticalMoisture: 35, tempMin: 15, tempMax: 25, humidityMin: 50, humidityMax: 70, phMin: 6.0, phMax: 7.5, nMin: 40, nMax: 60, pMin: 20, pMax: 40, kMin: 20, kMax: 40, recommendedMethod: 'Sprinkler/Drip' },
  Rice: { name: 'Rice', rootDepth: 0.25, moistureMin: 70, moistureMax: 100, criticalMoisture: 60, tempMin: 20, tempMax: 35, humidityMin: 60, humidityMax: 80, phMin: 5.5, phMax: 7.0, nMin: 60, nMax: 100, pMin: 30, pMax: 50, kMin: 30, kMax: 50, recommendedMethod: 'Flood' },
  Cotton: { name: 'Cotton', rootDepth: 0.7, moistureMin: 50, moistureMax: 70, criticalMoisture: 45, tempMin: 20, tempMax: 35, humidityMin: 50, humidityMax: 60, phMin: 6.0, phMax: 8.0, nMin: 60, nMax: 90, pMin: 30, pMax: 60, kMin: 40, kMax: 60, recommendedMethod: 'Drip' },
  Maize: { name: 'Maize', rootDepth: 0.6, moistureMin: 50, moistureMax: 75, criticalMoisture: 45, tempMin: 18, tempMax: 27, humidityMin: 50, humidityMax: 70, phMin: 5.5, phMax: 7.5, nMin: 80, nMax: 120, pMin: 30, pMax: 50, kMin: 40, kMax: 60, recommendedMethod: 'Sprinkler/Drip' },
  Potato: { name: 'Potato', rootDepth: 0.45, moistureMin: 60, moistureMax: 80, criticalMoisture: 55, tempMin: 15, tempMax: 20, humidityMin: 60, humidityMax: 80, phMin: 5.0, phMax: 6.5, nMin: 80, nMax: 120, pMin: 60, pMax: 80, kMin: 100, kMax: 150, recommendedMethod: 'Drip' },
  Sugarcane: { name: 'Sugarcane', rootDepth: 1.2, moistureMin: 60, moistureMax: 85, criticalMoisture: 55, tempMin: 20, tempMax: 35, humidityMin: 60, humidityMax: 80, phMin: 6.0, phMax: 7.5, nMin: 150, nMax: 250, pMin: 60, pMax: 100, kMin: 100, kMax: 150, recommendedMethod: 'Drip' },
  Tomato: { name: 'Tomato', rootDepth: 0.4, moistureMin: 60, moistureMax: 80, criticalMoisture: 50, tempMin: 18, tempMax: 27, humidityMin: 60, humidityMax: 70, phMin: 6.0, phMax: 6.8, nMin: 80, nMax: 120, pMin: 60, pMax: 80, kMin: 80, kMax: 120, recommendedMethod: 'Drip' },
  Groundnut: { name: 'Groundnut', rootDepth: 0.5, moistureMin: 50, moistureMax: 70, criticalMoisture: 45, tempMin: 20, tempMax: 30, humidityMin: 50, humidityMax: 60, phMin: 6.0, phMax: 7.0, nMin: 20, nMax: 40, pMin: 40, pMax: 60, kMin: 40, kMax: 60, recommendedMethod: 'Sprinkler' },
  Sunflower: { name: 'Sunflower', rootDepth: 1.0, moistureMin: 45, moistureMax: 65, criticalMoisture: 40, tempMin: 20, tempMax: 30, humidityMin: 50, humidityMax: 60, phMin: 6.0, phMax: 7.5, nMin: 60, nMax: 90, pMin: 40, pMax: 60, kMin: 40, kMax: 60, recommendedMethod: 'Sprinkler/Drip' },
};

interface IrrigationPlanResult {
  soil_condition_summary: string;
  rain_forecast_summary: string;
  lstm_predictions: number[];
  adjusted_predictions: number[];
  irrigation_plan: any[];
  immediate_irrigation: boolean;
  water_recommendation_liters: number;
  water_saved_estimate: number;
  next_irrigation_date: string;
  soil_factor: number;
  past_7_days: number[];
  recommended_irrigation_method: string;
  recommended_efficiency: number;
  root_depth: number;
  suitability_scores: Record<string, number>;
}

interface RealtimeIrrigationResult {
  recommended_irrigation_method: string;
  recommended_efficiency: number;
  recommended_water_liters: number;
  moisture_deficit_percent: number;
  soil_condition_summary: string;
  decision_trace: string[];
  root_depth: number;
  soil_factor: number;
  suitability_scores: Record<string, number>;
  calculation_breakdown: string;
  irrigate: boolean;
}

interface FarmData {
  id: string;
  timestamp: number;
  cropType: CropType;
  fieldNumber: string;
  location: string;
  fieldArea: number;
  soilType: 'Sandy' | 'Loamy' | 'Clay';
  soilMoisture: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  soilPH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  decisions: string[];
  irrigationResult?: IrrigationPlanResult;
  realtimeIrrigation?: RealtimeIrrigationResult;
}

interface Action {
  id: string;
  priority: number;
  action: string;
}

interface Notification {
  id: string;
  message: string;
  type: 'sms' | 'email' | 'app';
  timestamp: number;
}

const SOIL_RETENTION_FACTOR = {
  Sandy: 0.8,
  Loamy: 1.0,
  Clay: 1.2,
};

function formatDateTime(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day}/${month}/${year} ${time}`;
}

function useAgricultureSystem() {
  const [records, setRecords] = useState<FarmData[]>([]);
  const [waterUsed, setWaterUsed] = useState(0);
  const [waterSaved, setWaterSaved] = useState(0);
  const [urgentActions, setUrgentActions] = useState<Action[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addRecord = (data: Omit<FarmData, 'id' | 'timestamp' | 'decisions'>) => {
    const cropConfig = CROP_DATA[data.cropType] || CROP_DATA['Wheat'];
    const threshold = { moisture: cropConfig.criticalMoisture, temperature: cropConfig.tempMax };
    const decisions: string[] = [];
    const newActions: Action[] = [];
    const newNotifications: Notification[] = [];
    
    let currentWaterUsed = 0;
    let currentWaterSaved = 0;

    if (data.realtimeIrrigation) {
      decisions.push(...data.realtimeIrrigation.decision_trace);
      if (data.realtimeIrrigation.irrigate) {
        currentWaterUsed += data.realtimeIrrigation.recommended_water_liters;
        newActions.push({ id: crypto.randomUUID(), priority: 5, action: `Start ${data.realtimeIrrigation.recommended_irrigation_method} Irrigation` });
      } else {
        currentWaterSaved += 50;
      }
    } else {
      decisions.push("Collected farm sensor data");
    }

    // Irrigation (Future Predictor)
    if (data.irrigationResult) {
      if (data.irrigationResult.immediate_irrigation) {
        newActions.push({ id: crypto.randomUUID(), priority: 4, action: "Review 5-Day Irrigation Plan" });
      }
    }

    // Disease
    if (data.humidity > 80) {
      const msg = `ALERT: High Fungal Risk for ${data.cropType} Field ${data.fieldNumber}`;
      newNotifications.push({ id: crypto.randomUUID(), message: msg, type: 'sms', timestamp: Date.now() });
      newNotifications.push({ id: crypto.randomUUID(), message: msg, type: 'email', timestamp: Date.now() });
      newNotifications.push({ id: crypto.randomUUID(), message: msg, type: 'app', timestamp: Date.now() });
      decisions.push("High fungal risk detected");
      newActions.push({ id: crypto.randomUUID(), priority: 5, action: "Disease Alert" });
    }

    // Rainfall
    if (data.rainfall > 50) {
      decisions.push("Heavy rainfall detected");
      newActions.push({ id: crypto.randomUUID(), priority: 4, action: "Check Drainage System" });
    }

    // Fertilizer
    if (data.nitrogen < 40) {
      decisions.push("Low Nitrogen → Recommend Urea");
      newActions.push({ id: crypto.randomUUID(), priority: 4, action: "Apply Urea" });
    }
    if (data.phosphorus < 30) {
      decisions.push("Low Phosphorus → Recommend DAP");
      newActions.push({ id: crypto.randomUUID(), priority: 4, action: "Apply DAP" });
    }
    if (data.potassium < 30) {
      decisions.push("Low Potassium → Recommend MOP");
      newActions.push({ id: crypto.randomUUID(), priority: 3, action: "Apply MOP" });
    }
    if (data.soilPH < 6) {
      decisions.push("Soil Acidic → Apply Lime");
    } else if (data.soilPH > 8) {
      decisions.push("Soil Alkaline → Apply Gypsum");
    }

    const newRecord: FarmData = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      decisions
    };

    setRecords(prev => [newRecord, ...prev].slice(0, 100));
    setWaterUsed(prev => prev + currentWaterUsed);
    setWaterSaved(prev => prev + currentWaterSaved);
    
    setUrgentActions(prev => {
      const combined = [...prev, ...newActions];
      combined.sort((a, b) => b.priority - a.priority);
      return combined.slice(0, 10);
    });

    setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
    
    return newRecord;
  };

  const resolveAction = (id: string) => {
    setUrgentActions(prev => prev.filter(a => a.id !== id));
  };

  return {
    records,
    waterUsed,
    waterSaved,
    urgentActions,
    notifications,
    addRecord,
    resolveAction
  };
}

function calculateSoilFactor(N: number, P: number, K: number, pH: number) {
  let factor = 1.0;
  if (N < 30 || P < 20 || K < 20) factor += 0.2;
  else if (N > 80 || P > 60 || K > 60) factor -= 0.1;
  if (pH < 5.5 || pH > 7.5) factor += 0.15;
  return factor;
}

function mockLSTMPredict(currentMoisture: number, days: number): number[] {
  const predictions = [];
  let m = currentMoisture;
  for (let i = 0; i < days; i++) {
    m = m * 0.9;
    predictions.push(m);
  }
  return predictions;
}

function calculateEvaporation(temp: number, humidity: number): number {
  const baseEvap = 5;
  const tempEffect = Math.max(0, (temp - 20) * 0.5);
  const humidityEffect = Math.max(0, (80 - humidity) * 0.1);
  return baseEvap + tempEffect + humidityEffect;
}

function generatePast7DaysHistory(currentMoisture: number): number[] {
  const history = [];
  let m = currentMoisture + 30;
  for (let i = 0; i < 7; i++) {
    history.push(Math.min(100, Math.max(0, m)));
    m = m - (Math.random() * 5 + 2);
  }
  return history.reverse();
}

function calculateRealtimeIrrigation(data: any): RealtimeIrrigationResult {
  const trace: string[] = [];
  trace.push(`Sensor data collected: Moisture ${data.soilMoisture}%, Temp ${data.temperature}°C, Humidity ${data.humidity}%`);

  const cropConfig = CROP_DATA[data.cropType] || CROP_DATA['Wheat'];
  const threshold = { moisture: cropConfig.criticalMoisture, temperature: cropConfig.tempMax };
  
  let moisture_deficit_percent = threshold.moisture - data.soilMoisture;
  if (moisture_deficit_percent < 0) moisture_deficit_percent = 0;
  
  trace.push(`Moisture deficit calculated: ${moisture_deficit_percent.toFixed(1)}% (Threshold: ${threshold.moisture}%)`);

  const root_depth = cropConfig.rootDepth;
  trace.push(`Root depth selected: ${root_depth}m for ${data.cropType}`);

  let base_soil_factor = SOIL_RETENTION_FACTOR[data.soilType as keyof typeof SOIL_RETENTION_FACTOR] || 1.0;
  const nutrition_factor = calculateSoilFactor(data.nitrogen, data.phosphorus, data.potassium, data.soilPH);
  const final_soil_factor = base_soil_factor * nutrition_factor;
  trace.push(`Soil retention factor used: ${final_soil_factor.toFixed(2)} (Base: ${base_soil_factor}, Nutrition Adj: ${nutrition_factor.toFixed(2)})`);

  const scores = {
    Flood: 50,
    Sprinkler: 50,
    Drip: 50
  };
  
  if (data.soilType === 'Sandy') {
    scores.Flood -= 30;
    scores.Drip += 30;
  } else if (data.soilType === 'Clay') {
    scores.Flood += 10;
    scores.Drip -= 10;
  }
  
  if (cropConfig.recommendedMethod.includes('Flood')) {
    scores.Flood += 40;
    scores.Drip -= 20;
  }
  if (cropConfig.recommendedMethod.includes('Drip')) {
    scores.Drip += 30;
    scores.Flood -= 20;
  }
  if (cropConfig.recommendedMethod.includes('Sprinkler')) {
    scores.Sprinkler += 30;
  }

  trace.push(`Irrigation method scores evaluated: Flood(${scores.Flood}), Sprinkler(${scores.Sprinkler}), Drip(${scores.Drip})`);

  let best_method = 'Drip';
  let best_score = scores.Drip;
  if (scores.Sprinkler > best_score) { best_method = 'Sprinkler'; best_score = scores.Sprinkler; }
  if (scores.Flood > best_score) { best_method = 'Flood'; best_score = scores.Flood; }

  const efficiencies = { Flood: 0.6, Sprinkler: 0.75, Drip: 0.9 };
  const recommended_efficiency = efficiencies[best_method as keyof typeof efficiencies];

  trace.push(`Recommended irrigation method: ${best_method} (Efficiency: ${recommended_efficiency})`);

  let recommended_water_liters = 0;
  let irrigate = false;
  let calculation_breakdown = "";

  if (moisture_deficit_percent > 0) {
    irrigate = true;
    const deficit_fraction = moisture_deficit_percent / 100;
    const raw_water = (data.fieldArea * root_depth * deficit_fraction * 1000 * final_soil_factor) / recommended_efficiency;
    
    const safety_margin = 1.05;
    recommended_water_liters = Math.max(0, Math.round(raw_water * safety_margin));

    calculation_breakdown = `(${data.fieldArea}m² × ${root_depth}m × ${deficit_fraction.toFixed(2)} × 1000 × ${final_soil_factor.toFixed(2)}) ÷ ${recommended_efficiency} × 1.05 (Safety Margin) = ${recommended_water_liters}L`;
    trace.push(`Final water calculation: ${calculation_breakdown}`);
    trace.push(`Final irrigation decision: Irrigate with ${recommended_water_liters}L using ${best_method}`);
  } else {
    calculation_breakdown = "Deficit is 0, no water required.";
    trace.push(`Final water calculation: ${calculation_breakdown}`);
    trace.push(`Final irrigation decision: Wait (No irrigation needed)`);
  }

  let soil_condition_summary = "Moderate";
  if (final_soil_factor < 1.0) soil_condition_summary = "Good (Retains moisture well)";
  if (final_soil_factor > 1.2) soil_condition_summary = "Poor (Drains quickly)";

  return {
    recommended_irrigation_method: best_method,
    recommended_efficiency,
    recommended_water_liters,
    moisture_deficit_percent,
    soil_condition_summary,
    decision_trace: trace,
    root_depth,
    soil_factor: final_soil_factor,
    suitability_scores: scores,
    calculation_breakdown,
    irrigate
  };
}

async function generateIrrigationPlan(data: any): Promise<IrrigationPlanResult> {
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY || 'dummy_key';
  let weatherForecast: any[] = [];
  
  try {
    if (apiKey !== 'dummy_key') {
      const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${data.location}&days=5&aqi=no&alerts=no`);
      if (res.ok) {
        const weatherData = await res.json();
        weatherForecast = weatherData.forecast.forecastday.map((day: any) => ({
          date: day.date.split('-').reverse().join('/'),
          chance_of_rain: day.day.daily_chance_of_rain,
          precip_mm: day.day.totalprecip_mm,
          avgtemp_c: day.day.avgtemp_c,
          avghumidity: day.day.avghumidity
        }));
      } else {
        throw new Error("Weather API failed");
      }
    } else {
      throw new Error("No API key");
    }
  } catch (e) {
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      weatherForecast.push({
        date: d.toISOString().split('T')[0].split('-').reverse().join('/'),
        chance_of_rain: Math.floor(Math.random() * 50),
        precip_mm: Math.random() * 5,
        avgtemp_c: data.temperature + (Math.random() * 4 - 2),
        avghumidity: data.humidity + (Math.random() * 10 - 5)
      });
    }
  }

  const cropConfig = CROP_DATA[data.cropType] || CROP_DATA['Wheat'];
  const root_depth = cropConfig.rootDepth;
  let base_soil_factor = SOIL_RETENTION_FACTOR[data.soilType as keyof typeof SOIL_RETENTION_FACTOR] || 1.0;
  const nutrition_factor = calculateSoilFactor(data.nitrogen, data.phosphorus, data.potassium, data.soilPH);
  const final_soil_factor = base_soil_factor * nutrition_factor;

  const scores = { Flood: 50, Sprinkler: 50, Drip: 50 };
  if (data.soilType === 'Sandy') { scores.Flood -= 30; scores.Drip += 30; }
  else if (data.soilType === 'Clay') { scores.Flood += 10; scores.Drip -= 10; }
  
  if (cropConfig.recommendedMethod.includes('Flood')) { scores.Flood += 40; scores.Drip -= 20; }
  if (cropConfig.recommendedMethod.includes('Drip')) { scores.Drip += 30; scores.Flood -= 20; }
  if (cropConfig.recommendedMethod.includes('Sprinkler')) { scores.Sprinkler += 30; }

  let best_method = 'Drip';
  let best_score = scores.Drip;
  if (scores.Sprinkler > best_score) { best_method = 'Sprinkler'; best_score = scores.Sprinkler; }
  if (scores.Flood > best_score) { best_method = 'Flood'; best_score = scores.Flood; }

  const efficiencies = { Flood: 0.6, Sprinkler: 0.75, Drip: 0.9 };
  const recommended_efficiency = efficiencies[best_method as keyof typeof efficiencies];

  const lstm_predictions = mockLSTMPredict(data.soilMoisture, 5);
  
  const threshold = { moisture: cropConfig.criticalMoisture, temperature: cropConfig.tempMax };
  const emergency_threshold = threshold.moisture - 10;
  
  let immediate_irrigation = false;
  let current_moisture = data.soilMoisture;
  
  if (current_moisture < emergency_threshold) {
    immediate_irrigation = true;
    current_moisture += 40;
  }
  
  const plan = [];
  const adjusted_predictions = [];
  let total_water_recommended = 0;
  let total_water_saved = 0;
  
  let rain_expected = false;
  
  for (let i = 0; i < 5; i++) {
    const weather = weatherForecast[i];
    if (weather.chance_of_rain > 50 || weather.precip_mm > 5) {
      rain_expected = true;
    }
    
    const rain_effect = weather.precip_mm * 2;
    const evaporation = calculateEvaporation(weather.avgtemp_c, weather.avghumidity);
    
    const base_decay = lstm_predictions[i] - (i === 0 ? data.soilMoisture : lstm_predictions[i-1]);
    
    current_moisture = current_moisture + base_decay + rain_effect - (evaporation * final_soil_factor);
    current_moisture = Math.max(0, Math.min(100, current_moisture));
    
    adjusted_predictions.push(current_moisture);
    
    let irrigate = false;
    let water_amount = 0;
    
    if (current_moisture < threshold.moisture) {
      irrigate = true;
      const deficit = threshold.moisture - current_moisture + 10;
      
      const deficit_fraction = deficit / 100;
      const raw_water = (data.fieldArea * root_depth * deficit_fraction * 1000 * final_soil_factor) / recommended_efficiency;
      const safety_margin = 1.05;
      water_amount = Math.max(0, Math.round(raw_water * safety_margin));
      
      current_moisture += deficit;
      total_water_recommended += water_amount;
    } else {
      total_water_saved += 20;
    }
    
    plan.push({
      date: weather.date,
      predicted_moisture: current_moisture,
      irrigate,
      water_amount: Math.round(water_amount),
      weather
    });
  }
  
  let soil_condition_summary = "Moderate";
  if (final_soil_factor < 1.0) soil_condition_summary = "Good";
  if (final_soil_factor > 1.2) soil_condition_summary = "Poor";
  
  const next_irrigation = plan.find(p => p.irrigate);
  
  return {
    soil_condition_summary,
    rain_forecast_summary: rain_expected ? "Rain expected in the next 5 days." : "No significant rain expected.",
    lstm_predictions,
    adjusted_predictions,
    irrigation_plan: plan,
    immediate_irrigation,
    water_recommendation_liters: Math.round(immediate_irrigation ? total_water_recommended + 100 : total_water_recommended),
    water_saved_estimate: Math.round(total_water_saved),
    next_irrigation_date: next_irrigation ? next_irrigation.date : "None in 5 days",
    soil_factor: final_soil_factor,
    past_7_days: generatePast7DaysHistory(data.soilMoisture),
    recommended_irrigation_method: best_method,
    recommended_efficiency,
    root_depth,
    suitability_scores: scores
  };
}

export default function App() {
  const system = useAgricultureSystem();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'history' | 'analytics' | 'result' | 'ml' | 'predictor'>('dashboard');
  const [latestRecord, setLatestRecord] = useState<FarmData | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entry', label: 'Enter Data', icon: PlusCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: ChartIcon },
    { id: 'predictor', label: 'Irrigation Predictor', icon: Droplets },
    { id: 'ml', label: 'Crop Recommend', icon: BrainCircuit },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2 text-emerald-600">
          <Leaf className="w-6 h-6" />
          <span className="font-bold text-lg tracking-tight">Farmlytics</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-10 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:flex items-center space-x-2 text-emerald-600">
          <Leaf className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight">Farmlytics</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
        {activeTab === 'dashboard' && <DashboardView system={system} />}
        {activeTab === 'entry' && <DataEntryView onSubmit={(data) => { 
          const record = system.addRecord(data); 
          setLatestRecord(record);
          setActiveTab('result'); 
        }} />}
        {activeTab === 'history' && <HistoryView records={system.records} />}
        {activeTab === 'analytics' && <AnalyticsView records={system.records} />}
        {activeTab === 'ml' && <CropRecommendationView />}
        {activeTab === 'predictor' && <PredictorView records={system.records} />}
        {activeTab === 'result' && latestRecord && (
          <ResultView 
            record={latestRecord} 
            onContinue={() => setActiveTab('dashboard')} 
            onNewEntry={() => setActiveTab('entry')} 
          />
        )}
      </main>
    </div>
  );
}

function DashboardView({ system }: { system: ReturnType<typeof useAgricultureSystem> }) {
  const efficiency = system.waterUsed + system.waterSaved > 0 
    ? ((system.waterSaved / (system.waterUsed + system.waterSaved)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your farm's status and urgent actions.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Water Used" 
          value={`${system.waterUsed} L`} 
          icon={Droplets} 
          color="text-blue-500" 
          bg="bg-blue-50" 
        />
        <StatCard 
          title="Water Saved" 
          value={`${system.waterSaved} L`} 
          icon={Sprout} 
          color="text-emerald-500" 
          bg="bg-emerald-50" 
        />
        <StatCard 
          title="Water Efficiency" 
          value={`${efficiency}%`} 
          icon={Activity} 
          color="text-indigo-500" 
          bg="bg-indigo-50" 
        />
      </div>

      {/* Field Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-emerald-500" />
            Field Summary
          </h2>
        </div>
        <div className="p-5">
          {system.records.length === 0 ? (
            <p className="text-slate-400 text-center py-4 italic">No field data available yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {(Array.from(new Set(system.records.map(r => r.fieldNumber))) as string[]).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).map(fieldNum => {
                const latestRecord = system.records.find(r => r.fieldNumber === fieldNum);
                return (
                  <div key={fieldNum} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase mb-1">Field</span>
                    <span className="text-xl font-bold text-slate-800">{fieldNum}</span>
                    <span className="text-xs font-medium text-emerald-600 mt-1">{latestRecord?.cropType}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Urgent Actions
            </h2>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
              {system.urgentActions.length} Pending
            </span>
          </div>
          <div className="p-2 flex-1 overflow-y-auto max-h-[400px]">
            {system.urgentActions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400 opacity-50" />
                <p>All clear! No urgent actions required.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {system.urgentActions.map(action => (
                  <li key={action.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${action.priority >= 4 ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="font-medium text-slate-700">{action.action}</span>
                    </div>
                    <button 
                      onClick={() => system.resolveAction(action.id)}
                      className="text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Resolve
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" />
              Recent Notifications
            </h2>
          </div>
          <div className="p-2 flex-1 overflow-y-auto max-h-[400px]">
            {system.notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Bell className="w-12 h-12 mb-3 opacity-20" />
                <p>No recent notifications.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {system.notifications.map(notif => (
                  <li key={notif.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100">
                    <div className="mt-0.5">
                      {notif.type === 'sms' && <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">SMS</span>}
                      {notif.type === 'email' && <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">Mail</span>}
                      {notif.type === 'app' && <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded">App</span>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{notif.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDateTime(notif.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-xl ${bg} ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
    </div>
  );
}

function DataEntryView({ onSubmit }: { onSubmit: (data: Omit<FarmData, 'id' | 'timestamp' | 'decisions'>) => void }) {
  const [formData, setFormData] = useState({
    cropType: 'Wheat' as CropType,
    fieldNumber: '1',
    location: 'Chennai',
    fieldArea: 1000,
    soilType: 'Loamy' as 'Sandy' | 'Loamy' | 'Clay',
    soilMoisture: 30,
    temperature: 25,
    humidity: 60,
    rainfall: 10,
    soilPH: 6.5,
    nitrogen: 45,
    phosphorus: 35,
    potassium: 35,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    try {
      const realtimeIrrigation = calculateRealtimeIrrigation(formData);
      const irrigationResult = await generateIrrigationPlan(formData);
      onSubmit({ ...formData, irrigationResult, realtimeIrrigation });
    } catch (error) {
      console.error("Failed to generate irrigation plan:", error);
      const realtimeIrrigation = calculateRealtimeIrrigation(formData);
      onSubmit({ ...formData, realtimeIrrigation }); // Fallback
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'cropType' || name === 'fieldNumber' || name === 'location' || name === 'soilType') ? value : Number(value)
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Enter Farm Data</h1>
        <p className="text-slate-500 mt-1">Input current sensor readings to generate decisions.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Field Number */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Field Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="fieldNumber"
                  value={formData.fieldNumber}
                  onChange={handleChange}
                  placeholder="e.g. 1, 2A, North"
                  className="block w-full rounded-lg border-slate-300 bg-slate-50 border py-2.5 pl-10 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Location</label>
              <div className="relative">
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. London, Paris"
                  className="block w-full rounded-lg border-slate-300 bg-slate-50 border py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Field Area */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Field Area (m²)</label>
              <div className="relative">
                <input
                  type="number"
                  name="fieldArea"
                  value={formData.fieldArea}
                  onChange={handleChange}
                  placeholder="e.g. 1000"
                  className="block w-full rounded-lg border-slate-300 bg-slate-50 border py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Crop Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Crop Type</label>
              <select
                name="cropType"
                value={formData.cropType}
                onChange={handleChange}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                {Object.keys(CROP_DATA).map(crop => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
            </div>

            {/* Soil Type Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Soil Type</label>
              <select
                name="soilType"
                value={formData.soilType}
                onChange={handleChange}
                className="block w-full rounded-lg border-slate-300 bg-slate-50 border py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                <option value="Sandy">Sandy</option>
                <option value="Loamy">Loamy</option>
                <option value="Clay">Clay</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Environmental Data */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                <Thermometer className="w-4 h-4" /> Environment
              </h3>
              <InputGroup label="Soil Moisture (%)" name="soilMoisture" value={formData.soilMoisture} onChange={handleChange} icon={Droplets} />
              <InputGroup label="Temperature (°C)" name="temperature" value={formData.temperature} onChange={handleChange} icon={Thermometer} />
              <InputGroup label="Humidity (%)" name="humidity" value={formData.humidity} onChange={handleChange} icon={Wind} />
              <InputGroup label="Rainfall (mm)" name="rainfall" value={formData.rainfall} onChange={handleChange} icon={CloudRain} />
            </div>

            {/* Soil Nutrients */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                <Beaker className="w-4 h-4" /> Soil Nutrients
              </h3>
              <InputGroup label="Soil pH" name="soilPH" value={formData.soilPH} onChange={handleChange} step="0.1" />
              <InputGroup label="Nitrogen Level" name="nitrogen" value={formData.nitrogen} onChange={handleChange} />
              <InputGroup label="Phosphorus Level" name="phosphorus" value={formData.phosphorus} onChange={handleChange} />
              <InputGroup label="Potassium Level" name="potassium" value={formData.potassium} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
          <button 
            type="submit"
            disabled={isAnalyzing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-8 py-3 rounded-xl shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isAnalyzing ? (
              <span className="animate-pulse">Analyzing...</span>
            ) : (
              <>
                <Activity className="w-5 h-5" />
                Analyze & Generate Decisions
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function InputGroup({ label, name, value, onChange, type = "number", step = "1", icon: Icon }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          step={step}
          className={`block w-full rounded-lg border-slate-300 bg-slate-50 border py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${Icon ? 'pl-10' : 'pl-4'}`}
          required
        />
      </div>
    </div>
  );
}

function HistoryView({ records }: { records: FarmData[] }) {
  const [cropFilter, setCropFilter] = useState<'All' | CropType>('All');
  const [fieldFilter, setFieldFilter] = useState<string>('All');

  const uniqueFields = useMemo(() => {
    const fields = Array.from(new Set(records.map(r => r.fieldNumber)));
    return fields.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesCrop = cropFilter === 'All' || r.cropType === cropFilter;
      const matchesField = fieldFilter === 'All' || r.fieldNumber === fieldFilter;
      return matchesCrop && matchesField;
    });
  }, [records, cropFilter, fieldFilter]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 animate-in fade-in">
        <History className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-medium text-slate-600">No History Available</h2>
        <p className="mt-2">Enter some farm data to see the history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Input History</h1>
          <p className="text-slate-500 mt-1">Review past sensor readings and system decisions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Crop Filter */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
            {['All', ...Object.keys(CROP_DATA)].map((type) => (
              <button
                key={type}
                onClick={() => setCropFilter(type as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  cropFilter === type 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Field Filter */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Field:</span>
            <select 
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              className="text-xs font-medium text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer pr-8"
            >
              <option value="All">All Fields</option>
              {uniqueFields.map(field => (
                <option key={field} value={field}>Field {field}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No records found for the selected filter.</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{record.cropType} <span className="text-slate-400 font-normal mx-1">|</span> Field {record.fieldNumber}</h3>
                    <p className="text-xs text-slate-500">{formatDateTime(record.timestamp)}</p>
                  </div>
                </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-slate-600"><Droplets className="w-4 h-4 text-blue-500"/> {record.soilMoisture}%</span>
                <span className="flex items-center gap-1 text-slate-600"><Thermometer className="w-4 h-4 text-orange-500"/> {record.temperature}°C</span>
                <span className="flex items-center gap-1 text-slate-600"><CloudRain className="w-4 h-4 text-cyan-500"/> {record.rainfall}mm</span>
              </div>
            </div>
            <div className="p-5 bg-white">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Decision Trace</h4>
              <ul className="space-y-2">
                {record.decisions.map((decision, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-emerald-500 mt-0.5">→</span>
                    {decision}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
}

function AnalyticsView({ records }: { records: FarmData[] }) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 animate-in fade-in">
        <ChartIcon className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-medium text-slate-600">No Data to Visualize</h2>
        <p className="mt-2">Enter some farm data to see analytics here.</p>
      </div>
    );
  }

  // Reverse records for chronological order in charts
  const chartData = [...records].reverse().map((r, i) => ({
    name: `Entry ${i + 1}`,
    moisture: r.soilMoisture,
    temperature: r.temperature,
    rainfall: r.rainfall,
  }));

  // Aggregate data by field
  const fieldAverages = useMemo(() => {
    const fieldMap: Record<string, { moisture: number[], temperature: number[], rainfall: number[] }> = {};
    
    records.forEach(r => {
      if (!fieldMap[r.fieldNumber]) {
        fieldMap[r.fieldNumber] = { moisture: [], temperature: [], rainfall: [] };
      }
      fieldMap[r.fieldNumber].moisture.push(r.soilMoisture);
      fieldMap[r.fieldNumber].temperature.push(r.temperature);
      fieldMap[r.fieldNumber].rainfall.push(r.rainfall);
    });

    return Object.entries(fieldMap).map(([field, data]) => ({
      field: `Field ${field}`,
      avgMoisture: Number((data.moisture.reduce((a, b) => a + b, 0) / data.moisture.length).toFixed(1)),
      avgTemperature: Number((data.temperature.reduce((a, b) => a + b, 0) / data.temperature.length).toFixed(1)),
      avgRainfall: Number((data.rainfall.reduce((a, b) => a + b, 0) / data.rainfall.length).toFixed(1)),
    })).sort((a, b) => a.field.localeCompare(b.field, undefined, { numeric: true }));
  }, [records]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Visualize trends and compare performance across fields.</p>
      </header>

      {/* Field Comparison Summary */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-emerald-500" />
          Field Performance Comparison (Averages)
        </h2>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fieldAverages} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="field" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="avgMoisture" name="Avg Moisture (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgTemperature" name="Avg Temp (°C)" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgRainfall" name="Avg Rainfall (mm)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moisture Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-500" /> Soil Moisture Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-500" /> Temperature Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rainfall Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-cyan-500" /> Rainfall Comparison
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="rainfall" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultView({ record, onContinue, onNewEntry }: { record: FarmData, onContinue: () => void, onNewEntry: () => void }) {
  const [isAdvanced, setIsAdvanced] = useState(false);
  const cropConfig = CROP_DATA[record.cropType] || CROP_DATA['Wheat'];
  const threshold = { moisture: cropConfig.criticalMoisture, temperature: cropConfig.tempMax };
  
  const rti = record.realtimeIrrigation;

  // Evaluate states for display
  let irrigationState = "No Irrigation Needed";
  let irrigationColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
  let irrigationReason = `Soil moisture (${record.soilMoisture}%) is above the threshold (${threshold.moisture}%).`;
  
  if (rti) {
    if (rti.irrigate) {
      irrigationState = "Irrigation Required (ON)";
      irrigationColor = "text-blue-600 bg-blue-50 border-blue-200";
      irrigationReason = `Moisture deficit detected (${rti.moisture_deficit_percent.toFixed(1)}%). Recommended method: ${rti.recommended_irrigation_method}.`;
    } else {
      irrigationState = "Irrigation Postponed (Wait)";
      irrigationColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
      irrigationReason = `No moisture deficit detected. Soil condition is ${rti.soil_condition_summary}.`;
    }
  } else {
    // Fallback if rti is somehow missing
    if (record.soilMoisture < threshold.moisture && record.temperature > threshold.temperature) {
      irrigationState = "Irrigation Required (ON)";
      irrigationColor = "text-blue-600 bg-blue-50 border-blue-200";
      irrigationReason = `Soil moisture (${record.soilMoisture}%) is below threshold (${threshold.moisture}%) AND temperature (${record.temperature}°C) is high (>${threshold.temperature}°C), requiring immediate water supply.`;
    } else if (record.soilMoisture < threshold.moisture) {
      irrigationState = "Irrigation Postponed (Wait)";
      irrigationColor = "text-amber-600 bg-amber-50 border-amber-200";
      irrigationReason = `Soil moisture (${record.soilMoisture}%) is below threshold (${threshold.moisture}%), but temperature (${record.temperature}°C) is within safe limits (≤${threshold.temperature}°C). Irrigation is postponed to save water.`;
    }
  }

  let diseaseState = "Low Risk";
  let diseaseColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
  let diseaseReason = `Humidity (${record.humidity}%) is within safe levels (≤${cropConfig.humidityMax}%).`;
  
  if (record.humidity > cropConfig.humidityMax) {
    diseaseState = "High Fungal Risk";
    diseaseColor = "text-red-600 bg-red-50 border-red-200";
    diseaseReason = `Humidity (${record.humidity}%) exceeds ${cropConfig.humidityMax}%, creating an environment conducive to fungal growth for ${record.cropType}.`;
  }

  const fertilizers = [];
  const fertilizerReasons = [];
  
  if (record.nitrogen < cropConfig.nMin) {
    fertilizers.push("Urea (Low Nitrogen)");
    fertilizerReasons.push(`Nitrogen level (${record.nitrogen}) is below the optimal threshold (${cropConfig.nMin}).`);
  }
  if (record.phosphorus < cropConfig.pMin) {
    fertilizers.push("DAP (Low Phosphorus)");
    fertilizerReasons.push(`Phosphorus level (${record.phosphorus}) is below the optimal threshold (${cropConfig.pMin}).`);
  }
  if (record.potassium < cropConfig.kMin) {
    fertilizers.push("MOP (Low Potassium)");
    fertilizerReasons.push(`Potassium level (${record.potassium}) is below the optimal threshold (${cropConfig.kMin}).`);
  }
  if (record.soilPH < cropConfig.phMin) {
    fertilizers.push("Lime (Acidic Soil)");
    fertilizerReasons.push(`Soil pH (${record.soilPH}) is acidic (<${cropConfig.phMin}). Lime is required to neutralize acidity.`);
  } else if (record.soilPH > cropConfig.phMax) {
    fertilizers.push("Gypsum (Alkaline Soil)");
    fertilizerReasons.push(`Soil pH (${record.soilPH}) is alkaline (>${cropConfig.phMax}). Gypsum is required to reduce alkalinity.`);
  }

  const ir = record.irrigationResult;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analysis Results</h1>
          <p className="text-slate-500 mt-1">Detailed accountability for Field {record.fieldNumber} ({record.cropType})</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-400 uppercase">Timestamp</p>
          <p className="text-sm text-slate-600">{formatDateTime(record.timestamp)}</p>
        </div>
      </header>

      <div className="flex justify-end mb-4">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={isAdvanced} onChange={() => setIsAdvanced(!isAdvanced)} />
            <div className={`block w-10 h-6 rounded-full transition-colors ${isAdvanced ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAdvanced ? 'transform translate-x-4' : ''}`}></div>
          </div>
          <div className="ml-3 text-sm font-medium text-slate-700">
            Advanced View
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Irrigation Accountability */}
        <div className={`p-6 rounded-2xl border ${irrigationColor} shadow-sm flex flex-col md:col-span-2`}>
          <div className="flex items-center gap-3 mb-4">
            <Droplets className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Irrigation Decision</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/60 p-4 rounded-xl border border-white/40">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Status</p>
              <p className="text-lg font-bold">{irrigationState}</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl border border-white/40">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Recommended Method</p>
              <p className="text-lg font-bold">{rti?.recommended_irrigation_method || 'N/A'}</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl border border-white/40">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Water Required</p>
              <p className="text-lg font-bold">{rti?.recommended_water_liters || 0} L</p>
            </div>
            <div className="bg-white/60 p-4 rounded-xl border border-white/40">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Soil Condition</p>
              <p className="text-lg font-bold">{rti?.soil_condition_summary || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-white/60 p-4 rounded-xl border border-white/40 mb-6">
            <p className="text-sm font-medium"><strong>Reasoning:</strong> {irrigationReason}</p>
          </div>

          {isAdvanced && rti && (
            <div className="mt-6 pt-6 border-t border-black/10">
              <h3 className="text-md font-bold mb-4">Advanced Metrics & Calculation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="font-semibold mb-1">Root Depth: <span className="font-normal">{rti.root_depth}m</span></p>
                  <p className="font-semibold mb-1">Soil Factor: <span className="font-normal">{rti.soil_factor.toFixed(2)}</span></p>
                  <p className="font-semibold mb-1">Efficiency Value: <span className="font-normal">{rti.recommended_efficiency}</span></p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Suitability Scores:</p>
                  <ul className="list-disc list-inside opacity-80">
                    <li>Drip: {rti.suitability_scores.Drip}</li>
                    <li>Sprinkler: {rti.suitability_scores.Sprinkler}</li>
                    <li>Flood: {rti.suitability_scores.Flood}</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-black/10 font-mono text-xs">
                <p className="font-bold mb-2">Calculation Breakdown:</p>
                <p>{rti.calculation_breakdown}</p>
              </div>
            </div>
          )}
        </div>

        {/* Disease Accountability */}
        <div className={`p-6 rounded-2xl border ${diseaseColor} shadow-sm flex flex-col`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Disease Risk Assessment</h2>
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold mb-2">{diseaseState}</p>
            <p className="text-sm opacity-90 leading-relaxed">{diseaseReason}</p>
          </div>
        </div>

        {/* Fertilizer Accountability */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-2">
          <div className="flex items-center gap-3 mb-4 text-slate-800">
            <Beaker className="w-6 h-6 text-indigo-500" />
            <h2 className="text-lg font-semibold">Nutrient & Fertilizer Accountability</h2>
          </div>
          {fertilizers.length > 0 ? (
            <div className="space-y-4">
              {fertilizers.map((f, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {f}
                  </div>
                  <p className="text-sm text-slate-600">{fertilizerReasons[i]}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <p className="font-bold">Soil Nutrients Optimal</p>
                <p className="text-sm opacity-90">All nutrient levels (N, P, K) and pH are within the recommended range for {record.cropType}.</p>
              </div>
            </div>
          )}
        </div>

        {/* Decision Trace Section */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 shadow-sm md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-semibold">Decision Engine Trace</h2>
          </div>
          <div className="space-y-3 font-mono text-sm">
            {record.decisions.map((decision, idx) => (
              <div key={idx} className="flex items-start gap-3 group">
                <span className="text-emerald-500/50">[{idx + 1}]</span>
                <span className="text-emerald-400">→</span>
                <span className="group-hover:text-white transition-colors">{decision}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button 
          onClick={onContinue}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-center flex items-center justify-center gap-2"
        >
          <LayoutDashboard className="w-5 h-5" />
          Return to Dashboard
        </button>
        <button 
          onClick={onNewEntry}
          className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-bold px-6 py-4 rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Analyze Another Field
        </button>
      </div>
    </div>
  );
}

function PredictorView({ records }: { records: FarmData[] }) {
  const [selectedField, setSelectedField] = useState<string>('');

  const uniqueFields = useMemo(() => {
    const fields = Array.from(new Set(records.map(r => r.fieldNumber)));
    return fields.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [records]);

  useEffect(() => {
    if (uniqueFields.length > 0 && (!selectedField || !uniqueFields.includes(selectedField))) {
      setSelectedField(uniqueFields[0]);
    }
  }, [uniqueFields, selectedField]);

  const record = useMemo(() => {
    if (!selectedField) return null;
    return records.find(r => r.fieldNumber === selectedField) || null;
  }, [records, selectedField]);

  if (records.length === 0 || !record || !record.irrigationResult) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 animate-in fade-in">
        <Droplets className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-medium text-slate-600">No Prediction Available</h2>
        <p className="mt-2">Enter farm data first to generate a 5-day irrigation plan.</p>
      </div>
    );
  }

  const ir = record.irrigationResult;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Droplets className="w-8 h-8 text-blue-500" />
            Irrigation Predictor
          </h1>
          <p className="text-slate-500 mt-1">5-day irrigation plan for Field {record.fieldNumber} ({record.cropType})</p>
        </div>
        
        {uniqueFields.length > 0 && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase px-2">Select Field:</span>
            <select 
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="text-sm font-medium text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer pr-8"
            >
              {uniqueFields.map(field => (
                <option key={field} value={field}>Field {field}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div className={`p-6 rounded-2xl border ${ir.immediate_irrigation ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'} shadow-sm flex flex-col`}>
        <div className="flex items-center gap-3 mb-4">
          <Droplets className="w-6 h-6" />
          <h2 className="text-lg font-semibold">5-Day Irrigation Plan</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white/60 p-4 rounded-xl border border-white/40">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Status</p>
            <p className="text-lg font-bold">{ir.immediate_irrigation ? "Immediate Action Required" : "Monitoring"}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-xl border border-white/40">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Next Irrigation</p>
            <p className="text-lg font-bold">{ir.next_irrigation_date}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-xl border border-white/40">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Method</p>
            <p className="text-lg font-bold">{ir.recommended_irrigation_method || 'N/A'}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-xl border border-white/40">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Water Needed</p>
            <p className="text-lg font-bold">{ir.water_recommendation_liters} L</p>
          </div>
          <div className="bg-white/60 p-4 rounded-xl border border-white/40">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Water Saved</p>
            <p className="text-lg font-bold">{ir.water_saved_estimate} L</p>
          </div>
        </div>

        <div className="bg-white/60 p-4 rounded-xl border border-white/40 mb-6">
          <p className="text-sm font-medium"><strong>Weather:</strong> {ir.rain_forecast_summary}</p>
          <p className="text-sm font-medium mt-1"><strong>Soil Condition:</strong> {ir.soil_condition_summary}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-white/40 border-b border-black/10">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Rain Chance</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {ir.irrigation_plan.map((day, idx) => (
                <tr key={idx} className="hover:bg-white/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{day.date}</td>
                  <td className="px-4 py-3">{day.weather.chance_of_rain}% ({day.weather.precip_mm}mm)</td>
                  <td className="px-4 py-3">
                    {day.irrigate ? (
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Irrigate</span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Skip</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{day.irrigate ? `${day.water_amount} L` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-6 border-t border-black/10">
          <h3 className="text-md font-bold mb-4">Advanced Metrics (LSTM & Evaporation Model)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-2">Soil Nutrition Factor: {ir.soil_factor.toFixed(2)}</p>
              <p className="opacity-80 mb-4">Adjusts moisture retention based on NPK and pH levels.</p>
              <p className="font-semibold mb-1">Root Depth: <span className="font-normal">{ir.root_depth}m</span></p>
              <p className="font-semibold mb-1">Efficiency Value: <span className="font-normal">{ir.recommended_efficiency}</span></p>
            </div>
            <div>
              <p className="font-semibold mb-1">Suitability Scores:</p>
              <ul className="list-disc list-inside opacity-80">
                <li>Drip: {ir.suitability_scores?.Drip || 0}</li>
                <li>Sprinkler: {ir.suitability_scores?.Sprinkler || 0}</li>
                <li>Flood: {ir.suitability_scores?.Flood || 0}</li>
              </ul>
            </div>
          </div>
          
          <div className="h-64 mt-4 bg-white rounded-xl p-4 border border-black/10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ir.past_7_days.map((m, i) => ({ day: `Day -${7-i}`, moisture: m })).concat(ir.adjusted_predictions.map((m, i) => ({ day: `Day +${i+1}`, moisture: m })))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" fontSize={10} />
                <YAxis domain={[0, 100]} fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}


