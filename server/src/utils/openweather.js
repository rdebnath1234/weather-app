import axios from "axios";

const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";

export const fetchWeatherByCity = async (city) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENWEATHER_API_KEY is not set");
    err.status = 500;
    throw err;
  }

  const response = await axios.get(BASE_URL, {
    params: {
      q: city,
      appid: apiKey,
      units: "metric",
    },
    timeout: 8000,
  });

  return response.data;
};

export const fetchForecastByCity = async (city) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENWEATHER_API_KEY is not set");
    err.status = 500;
    throw err;
  }

  const response = await axios.get(FORECAST_URL, {
    params: {
      q: city,
      appid: apiKey,
      units: "metric",
    },
    timeout: 8000,
  });

  return response.data;
};

export const fetchGeoByCity = async (city) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENWEATHER_API_KEY is not set");
    err.status = 500;
    throw err;
  }

  const response = await axios.get(GEO_URL, {
    params: {
      q: city,
      limit: 5,
      appid: apiKey,
    },
    timeout: 8000,
  });

  return response.data;
};

export const fetchWeatherByCoords = async (lat, lon) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENWEATHER_API_KEY is not set");
    err.status = 500;
    throw err;
  }

  const response = await axios.get(BASE_URL, {
    params: {
      lat,
      lon,
      appid: apiKey,
      units: "metric",
    },
    timeout: 8000,
  });

  return response.data;
};

export const fetchForecastByCoords = async (lat, lon) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENWEATHER_API_KEY is not set");
    err.status = 500;
    throw err;
  }

  const response = await axios.get(FORECAST_URL, {
    params: {
      lat,
      lon,
      appid: apiKey,
      units: "metric",
    },
    timeout: 8000,
  });

  return response.data;
};
