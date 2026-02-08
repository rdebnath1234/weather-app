import express from "express";
import { query } from "express-validator";
import User from "../models/User.js";
import { validateRequest } from "../middleware/validate.js";
import { optionalAuth } from "../middleware/auth.js";
import { normalizeCity } from "../utils/sanitize.js";
import {
  fetchForecastByCoords,
  fetchGeoByCity,
  fetchWeatherByCoords,
} from "../utils/openweather.js";

const router = express.Router();

router.get(
  "/",
  [
    query("city")
      .trim()
      .notEmpty()
      .withMessage("City is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("City must be between 2 and 100 characters"),
  ],
  validateRequest,
  optionalAuth,
  async (req, res, next) => {
    try {
      const rawCity = req.query.city;
      const city = normalizeCity(rawCity);

      if (!city) {
        return res.status(400).json({ message: "City is required" });
      }

      const geos = await fetchGeoByCity(city);
      if (!geos || geos.length === 0) {
        return res.status(404).json({ message: "City not found" });
      }

      const geo = geos[0];
      const lat = geo.lat;
      const lon = geo.lon;

      const [data, forecast] = await Promise.all([
        fetchWeatherByCoords(lat, lon),
        fetchForecastByCoords(lat, lon),
      ]);

      const timezoneOffset = forecast?.city?.timezone || data.timezone || 0;
      const now = Math.floor(Date.now() / 1000);
      const hourly = (forecast?.list || [])
        .filter((item) => item.dt >= now)
        .slice(0, 8)
        .map((item) => ({
          time: item.dt,
          temp: item.main?.temp,
          icon: item.weather?.[0]?.icon || "",
          pop: item.pop ?? 0,
        }));

      const dailyMap = new Map();
      (forecast?.list || []).forEach((item) => {
        const localDate = new Date((item.dt + timezoneOffset) * 1000)
          .toISOString()
          .slice(0, 10);
        const current = dailyMap.get(localDate) || {
          date: localDate,
          minTemp: item.main?.temp_min,
          maxTemp: item.main?.temp_max,
          icon: item.weather?.[0]?.icon || "",
          sampleTime: item.dt,
        };
        current.minTemp =
          current.minTemp == null
            ? item.main?.temp_min
            : Math.min(current.minTemp, item.main?.temp_min ?? current.minTemp);
        current.maxTemp =
          current.maxTemp == null
            ? item.main?.temp_max
            : Math.max(current.maxTemp, item.main?.temp_max ?? current.maxTemp);
        const hour = new Date((item.dt + timezoneOffset) * 1000).getUTCHours();
        if (Math.abs(hour - 12) < Math.abs(new Date((current.sampleTime + timezoneOffset) * 1000).getUTCHours() - 12)) {
          current.icon = item.weather?.[0]?.icon || current.icon;
          current.sampleTime = item.dt;
        }
        dailyMap.set(localDate, current);
      });

      const daily = Array.from(dailyMap.values())
        .sort((a, b) => (a.date > b.date ? 1 : -1))
        .slice(1, 6)
        .map((item) => ({
          date: item.date,
          minTemp: item.minTemp,
          maxTemp: item.maxTemp,
          icon: item.icon,
        }));

      const resolvedCity = geo.name || data.name;
      const resolvedCountry = geo.country || data.sys?.country || "";

      const payload = {
        city: resolvedCity,
        country: resolvedCountry,
        temperature: data.main?.temp,
        feelsLike: data.main?.feels_like,
        description: data.weather?.[0]?.description || "",
        icon: data.weather?.[0]?.icon || "",
        humidity: data.main?.humidity,
        pressure: data.main?.pressure,
        visibility: data.visibility,
        windSpeed: data.wind?.speed,
        sunrise: data.sys?.sunrise,
        sunset: data.sys?.sunset,
        timezone: data.timezone,
        forecast: {
          hourly,
          daily,
        },
      };

      if (req.user?.id) {
        await User.findByIdAndUpdate(req.user.id, {
          $push: {
            history: {
              $each: [
                {
                  city: payload.city,
                  country: payload.country,
                  lastSearchedAt: new Date(),
                },
              ],
              $slice: -20,
            },
          },
        });
      }

      return res.json(payload);
    } catch (err) {
      if (err.code === "ECONNABORTED") {
        return res.status(504).json({ message: "Weather service timeout" });
      }
      return next(err);
    }
  }
);

export default router;
