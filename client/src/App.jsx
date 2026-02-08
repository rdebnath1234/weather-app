import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const getToken = () => localStorage.getItem("weather_token");
const setToken = (token) => localStorage.setItem("weather_token", token);
const clearToken = () => localStorage.removeItem("weather_token");
const getStoredUser = () => {
  const raw = localStorage.getItem("weather_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const setStoredUser = (user) =>
  localStorage.setItem("weather_user", JSON.stringify(user));
const clearStoredUser = () => localStorage.removeItem("weather_user");

const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["x-auth-token"] = token;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      Array.isArray(data.errors) && data.errors.length > 0
        ? data.errors.map((err) => err.message).join(", ")
        : "";
    const message = detail ? `${data.message || "Request failed"}: ${detail}` : data.message;
    throw new Error(message || "Request failed");
  }
  return data;
};

const formatTime = (unix, offsetSeconds, options = {}) => {
  if (!unix && unix !== 0) return "--";
  const date = new Date((unix + offsetSeconds) * 1000);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    ...options,
  });
};

const formatDay = (dateString) => {
  if (!dateString) return "--";
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toFahrenheit = (tempC) => (tempC * 9) / 5 + 32;
const formatTemp = (tempC, unit) => {
  if (tempC == null) return "--";
  const value = unit === "f" ? toFahrenheit(tempC) : tempC;
  return `${Math.round(value)}°`;
};

const formatSpeed = (speedMs, unit) => {
  if (speedMs == null) return "--";
  if (unit === "f") {
    const mph = speedMs * 2.23694;
    return `${mph.toFixed(1)} mph`;
  }
  return `${speedMs} m/s`;
};

const formatVisibility = (meters, unit) => {
  if (meters == null) return "--";
  if (unit === "f") {
    const miles = meters / 1609.34;
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(meters / 1000)} km`;
};

const buildSmoothPath = (points, width = 100, height = 60) => {
  if (!points.length) return "";
  if (points.length === 1) return `M 0 ${height / 2}`;
  const toPoint = (pt, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - pt;
    return { x, y };
  };
  const mapped = points.map((pt, idx) => toPoint(pt, idx));
  let d = `M ${mapped[0].x} ${mapped[0].y}`;
  for (let i = 0; i < mapped.length - 1; i += 1) {
    const current = mapped[i];
    const next = mapped[i + 1];
    const controlX = (current.x + next.x) / 2;
    d += ` Q ${controlX} ${current.y} ${next.x} ${next.y}`;
  }
  return d;
};

const App = () => {
  const [cityInput, setCityInput] = useState("");
  const [unit, setUnit] = useState("c");
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [activeTab, setActiveTab] = useState("loginForm");
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const favoriteEnabled = useMemo(() => Boolean(weather?.city), [weather?.city]);
  const [chartMode, setChartMode] = useState("temp");
  const dailyPanelRef = useRef(null);
  const loginEmailRef = useRef(null);

  const isLoggedIn = useMemo(() => Boolean(getToken()), [authUser]);

  const loadUserData = async () => {
    if (!getToken()) {
      setFavorites([]);
      setHistory([]);
      return;
    }
    try {
      const [fav, hist] = await Promise.all([
        apiFetch("/api/user/favorites"),
        apiFetch("/api/user/history"),
      ]);
      setFavorites(fav.favorites || []);
      setHistory(hist.history || []);
    } catch (err) {
      setFavorites([]);
      setHistory([]);
    }
  };

  const searchWeather = async (nextCity) => {
    const rawInput = typeof nextCity === "string" ? nextCity : cityInput;
    const city = rawInput.trim();
    if (!city) {
      setWeatherError("Please enter a city name.");
      return;
    }

    setWeatherError("");
    setCityInput(city);

    try {
      const data = await apiFetch(`/api/weather?city=${encodeURIComponent(city)}`);
      setWeather(data);
      await loadUserData();
    } catch (err) {
      setWeatherError(err.message);
    }
  };

  const addFavorite = async () => {
    if (!isLoggedIn) {
      setWeatherError("Login to save favorites.");
      setActiveTab("loginForm");
      requestAnimationFrame(() => {
        if (loginEmailRef.current) {
          loginEmailRef.current.focus();
          loginEmailRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
      return;
    }
    if (!weather?.city) {
      setWeatherError("Search for a city first.");
      return;
    }
    try {
      await apiFetch("/api/user/favorites", {
        method: "POST",
        body: JSON.stringify({ city: weather.city, country: weather.country || "" }),
      });
      await loadUserData();
    } catch (err) {
      setWeatherError(err.message);
    }
  };

  const removeFavorite = async (item) => {
    try {
      await apiFetch(`/api/user/favorites/${item._id}`, { method: "DELETE" });
      await loadUserData();
    } catch (err) {
      setWeatherError(err.message);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");
    const email = event.target.email.value.trim();
    const password = event.target.password.value.trim();

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setAuthUser(data.user);
      setStoredUser(data.user);
      await loadUserData();
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setRegisterError("");
    const name = event.target.name.value.trim();
    const email = event.target.email.value.trim();
    const password = event.target.password.value.trim();

    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setToken(data.token);
      setAuthUser(data.user);
      setStoredUser(data.user);
      await loadUserData();
    } catch (err) {
      setRegisterError(err.message);
    }
  };

  const handleLogout = () => {
    clearToken();
    clearStoredUser();
    setAuthUser(null);
  };

  useEffect(() => {
    if (getToken()) {
      setAuthUser((prev) => prev || getStoredUser() || { name: "Weather fan" });
      loadUserData();
    }
  }, []);

  const displayCity = weather?.city
    ? `${weather.city}${weather.country ? ", " + weather.country : ""}`
    : "--";

  const timezoneOffset = weather?.timezone || 0;
  const hourly = weather?.forecast?.hourly || [];
  const daily = weather?.forecast?.daily || [];
  const chanceOfRain = hourly[0]?.pop != null ? Math.round(hourly[0].pop * 100) : null;

  const chartData = useMemo(() => {
    if (!hourly.length) return { points: [], path: "", area: "" };
    const values =
      chartMode === "pop"
        ? hourly.map((item) => (item.pop == null ? null : item.pop))
        : hourly.map((item) => (item.temp == null ? null : item.temp));
    const filtered = values.filter((value) => value != null);
    if (!filtered.length) return { points: [], path: "", area: "" };
    const minValue = Math.min(...filtered);
    const maxValue = Math.max(...filtered);
    const span = maxValue - minValue || 1;
    const points = values.map((value) => {
      const normalized = value == null ? 0.5 : (value - minValue) / span;
      return 12 + normalized * 36;
    });
    const path = buildSmoothPath(points);
    const area = path ? `${path} L 100 60 L 0 60 Z` : "";
    return { points, path, area };
  }, [hourly, chartMode]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className={`toggle ${unit === "f" ? "is-f" : ""}`}>
            <button
              type="button"
              className={`toggle-btn ${unit === "c" ? "active" : ""}`}
              onClick={() => setUnit("c")}
            >
              °C
            </button>
            <button
              type="button"
              className={`toggle-btn ${unit === "f" ? "active" : ""}`}
              onClick={() => setUnit("f")}
            >
              °F
            </button>
          </div>
        </div>

        <div className="location">
          <p className="label">Selected City</p>
          <h3>{displayCity}</h3>
          <p className="muted">{formatDay(new Date().toISOString().slice(0, 10))}</p>
          <div className="sun-times">
            <div>
              <span>Sunrise</span>
              <strong>{formatTime(weather?.sunrise, timezoneOffset)}</strong>
            </div>
            <div>
              <span>Sunset</span>
              <strong>{formatTime(weather?.sunset, timezoneOffset)}</strong>
            </div>
          </div>
        </div>

        <div className="current-temp">
          <h1>{formatTemp(weather?.temperature, unit)}</h1>
          <p>{weather?.description || "Search for a city to begin."}</p>
          {weather?.icon ? (
            <img
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt="Weather icon"
            />
          ) : null}
        </div>

        <div className="sidebar-cta">
          <button
            id="favoriteBtn"
            className="ghost"
            type="button"
            onClick={addFavorite}
            disabled={!favoriteEnabled}
          >
            Add to Favorites
          </button>
          {!isLoggedIn ? (
            <p className="muted">Login to save favorites.</p>
          ) : null}
          {weatherError ? <p className="error">{weatherError}</p> : null}
        </div>

        <div className="city-illustration" />
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {isLoggedIn ? "Welcome back" : "Welcome"}
            </p>
            <h2>
              {isLoggedIn
                ? `Hi ${authUser?.name || "traveler"}, here is your weather update.`
                : "Check out today’s weather information"}
            </h2>
          </div>
          <div className="profile">
            <div className="profile-info">
              <p className="label">{isLoggedIn ? "Signed in" : "Guest mode"}</p>
              <p className="value">
                {isLoggedIn
                  ? `${authUser?.name || "Weather fan"}`
                  : "Log in to unlock favorites"}
              </p>
            </div>
            <div className="avatar">{(authUser?.name || "G").slice(0, 1)}</div>
          </div>
        </header>

        <section className="panel search-panel">
          <div className="search-row">
            <input
              type="text"
              placeholder="Search city"
              value={cityInput}
              onChange={(event) => setCityInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") searchWeather();
              }}
              id="city-search"
              name="city"
              autoComplete="off"
            />
            <button type="button" onClick={searchWeather}>
              Search
            </button>
          </div>
          <p className="helper">Try: Paris, Tokyo, Lagos</p>
        </section>

        <section className="panel forecast-panel">
          <div className="forecast-header">
            <div>
              <h3>Upcoming hours</h3>
              <p className="helper">Real-time precipitation probability</p>
            </div>
            <div className="forecast-actions">
              <button
                className="pill-chip"
                type="button"
                onClick={() => setChartMode((prev) => (prev === "temp" ? "pop" : "temp"))}
              >
                {chartMode === "pop" ? "Rain precipitation" : "Temperature curve"}
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() =>
                  dailyPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Next days
              </button>
            </div>
          </div>

          <div className="forecast-body">
            <div className="hourly-grid">
              {hourly.length === 0 ? (
                <div className="empty">Search a city to see hourly forecast.</div>
              ) : (
                hourly.map((item, index) => (
                  <div className="hour-card" key={`${item.time}-${index}`}>
                    <span>{index === 0 ? "Now" : formatTime(item.time, timezoneOffset)}</span>
                    {item.icon ? (
                      <img
                        src={`https://openweathermap.org/img/wn/${item.icon}.png`}
                        alt="Forecast icon"
                      />
                    ) : null}
                    <strong>{formatTemp(item.temp, unit)}</strong>
                    <em>{item.pop != null ? `${Math.round(item.pop * 100)}%` : "--"}</em>
                  <span className="tooltip">
                    {formatTime(item.time, timezoneOffset)} ·{" "}
                    {chartMode === "pop"
                      ? item.pop != null
                        ? `${Math.round(item.pop * 100)}% rain`
                        : "No rain data"
                      : formatTemp(item.temp, unit)}
                  </span>
                </div>
              ))
            )}
          </div>

            <div className="chart">
              {chartData.path ? (
                <svg viewBox="0 0 100 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="tempFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6fa8ff" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#6fa8ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={chartData.path}
                    fill="none"
                    stroke="#4e84d2"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d={chartData.area} fill="url(#tempFill)" />
                </svg>
              ) : (
                <div className="empty">No chart data yet.</div>
              )}
            </div>
          </div>
        </section>

        <section className="panel metrics-panel">
          <h3>More details of today’s weather</h3>
          <div className="metrics-grid">
            <div className="mini-card">
              <div className="metric-top">
                <p className="label">Humidity</p>
                <span className="chip">{weather?.humidity ? `${weather.humidity}%` : "--"}</span>
              </div>
              <div className="meter">
                <span style={{ width: `${weather?.humidity || 0}%` }} />
              </div>
              <p className="muted">Comfort level</p>
            </div>
            <div className="mini-card">
              <div className="metric-top">
                <p className="label">Wind</p>
                <span className="chip">{formatSpeed(weather?.windSpeed, unit)}</span>
              </div>
              <div className="meter">
                <span
                  style={{
                    width: `${clamp((weather?.windSpeed || 0) * 10, 0, 100)}%`,
                  }}
                />
              </div>
              <p className="muted">Gusts & breeze</p>
            </div>
            <div className="mini-card">
              <div className="metric-top">
                <p className="label">Pressure</p>
                <span className="chip">
                  {weather?.pressure ? `${weather.pressure} hPa` : "--"}
                </span>
              </div>
              <div className="meter">
                <span
                  style={{
                    width: `${clamp(((weather?.pressure || 0) - 900) / 2, 0, 100)}%`,
                  }}
                />
              </div>
              <p className="muted">Sea-level trend</p>
            </div>
            <div className="mini-card">
              <div className="metric-top">
                <p className="label">Feels Like</p>
                <span className="chip">{formatTemp(weather?.feelsLike, unit)}</span>
              </div>
              <div className="meter">
                <span
                  style={{
                    width: `${clamp((weather?.feelsLike || 0) + 40, 0, 100)}%`,
                  }}
                />
              </div>
              <p className="muted">Perceived temp</p>
            </div>
            <div className="mini-card">
              <div className="metric-top">
                <p className="label">Visibility</p>
                <span className="chip">{formatVisibility(weather?.visibility, unit)}</span>
              </div>
              <div className="meter">
                <span
                  style={{
                    width: `${clamp(((weather?.visibility || 0) / 10000) * 100, 0, 100)}%`,
                  }}
                />
              </div>
              <p className="muted">Clarity range</p>
            </div>
            <div className="mini-card">
              <div className="metric-top">
                <p className="label">Chance of rain</p>
                <span className="chip">
                  {chanceOfRain != null ? `${chanceOfRain}%` : "--"}
                </span>
              </div>
              <div className="meter">
                <span style={{ width: `${chanceOfRain || 0}%` }} />
              </div>
              <p className="muted">Next hour</p>
            </div>
          </div>
        </section>

        <section className="panel daily-panel" ref={dailyPanelRef}>
          <div className="daily-header">
            <h3>Next days</h3>
            <p className="helper">Lightweight 5-day overview</p>
          </div>
          <div className="daily-grid">
            {daily.length === 0 ? (
              <div className="empty">Search a city to see the week ahead.</div>
            ) : (
              daily.map((item) => (
                <div className="day-card" key={item.date}>
                  <span>{formatDay(item.date)}</span>
                  {item.icon ? (
                    <img
                      src={`https://openweathermap.org/img/wn/${item.icon}.png`}
                      alt="Daily weather"
                    />
                  ) : null}
                  <strong>
                    {formatTemp(item.maxTemp, unit)}
                    <em>{formatTemp(item.minTemp, unit)}</em>
                  </strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel split-panel">
          <div className="auth-panel">
            <h3>Account</h3>
            {!isLoggedIn ? (
              <>
                <div className="auth-switch">
                  <button
                    className={`tab ${activeTab === "loginForm" ? "active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("loginForm")}
                  >
                    Login
                  </button>
                  <button
                    className={`tab ${activeTab === "registerForm" ? "active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("registerForm")}
                  >
                    Register
                  </button>
                </div>

                {activeTab === "loginForm" ? (
                  <form className="auth-form" onSubmit={handleLogin}>
                    <label htmlFor="login-email">
                      Email
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        ref={loginEmailRef}
                      />
                    </label>
                    <label htmlFor="login-password">
                      Password
                      <input
                        id="login-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                      />
                    </label>
                    <button type="submit">Login</button>
                    {loginError ? <p className="error">{loginError}</p> : null}
                  </form>
                ) : (
                  <form className="auth-form" onSubmit={handleRegister}>
                    <label htmlFor="register-name">
                      Name
                      <input
                        id="register-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                      />
                    </label>
                    <label htmlFor="register-email">
                      Email
                      <input
                        id="register-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                      />
                    </label>
                    <label htmlFor="register-password">
                      Password
                      <input
                        id="register-password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                      />
                    </label>
                    <button type="submit">Create Account</button>
                    {registerError ? <p className="error">{registerError}</p> : null}
                  </form>
                )}
              </>
            ) : (
              <button className="ghost" type="button" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>

          <div className="lists-panel">
            <div className="panel-sub">
              <h3>Favorites</h3>
              <p className="helper">
                {isLoggedIn ? "Your saved favorites." : "Login to manage favorites."}
              </p>
              <ul className="list">
                {favorites.length === 0 ? (
                  <li>Nothing yet.</li>
                ) : (
                  favorites.map((item) => (
                    <li key={item._id}>
                      <button
                        type="button"
                        className="link"
                        onClick={() => searchWeather(item.city)}
                      >
                        {item.city}
                        {item.country ? `, ${item.country}` : ""}
                      </button>
                      <button type="button" onClick={() => removeFavorite(item)}>
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="panel-sub">
              <h3>Search History</h3>
              <p className="helper">
                {isLoggedIn ? "Your recent searches." : "Login to see search history."}
              </p>
              <ul className="list">
                {history.length === 0 ? (
                  <li>Nothing yet.</li>
                ) : (
                  history.map((item) => (
                    <li key={item._id}>
                      <button
                        type="button"
                        className="link"
                        onClick={() => searchWeather(item.city)}
                      >
                        {item.city}
                        {item.country ? `, ${item.country}` : ""}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
};

export default App;
