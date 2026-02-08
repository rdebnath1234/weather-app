const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const weatherCity = document.getElementById("weatherCity");
const weatherDesc = document.getElementById("weatherDesc");
const weatherTemp = document.getElementById("weatherTemp");
const weatherHumidity = document.getElementById("weatherHumidity");
const weatherWind = document.getElementById("weatherWind");
const weatherIcon = document.getElementById("weatherIcon");
const weatherError = document.getElementById("weatherError");
const favoriteBtn = document.getElementById("favoriteBtn");

const authStatus = document.getElementById("authStatus");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");
const logoutBtn = document.getElementById("logoutBtn");
const authSwitch = document.querySelector(".auth-switch");

const favoritesList = document.getElementById("favoritesList");
const historyList = document.getElementById("historyList");
const favoritesHelper = document.getElementById("favoritesHelper");
const historyHelper = document.getElementById("historyHelper");

const tabs = document.querySelectorAll(".tab");

let lastCityPayload = null;
favoriteBtn.disabled = true;

const API_BASE = "";

const getToken = () => localStorage.getItem("weather_token");
const setToken = (token) => localStorage.setItem("weather_token", token);
const clearToken = () => localStorage.removeItem("weather_token");

const setStatus = (title, subtitle) => {
  authStatus.innerHTML = `
    <p class="label">${title}</p>
    <p class="value">${subtitle}</p>
  `;
};

const toggleAuthUI = (isLoggedIn, user) => {
  if (isLoggedIn) {
    setStatus("Signed in", `${user?.name || "Weather fan"} · ${user?.email || ""}`);
    logoutBtn.classList.remove("hidden");
    authSwitch.classList.add("hidden");
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    favoritesHelper.textContent = "Your saved favorites.";
    historyHelper.textContent = "Your recent searches.";
  } else {
    setStatus("Signed out", "Log in to unlock favorites and history.");
    logoutBtn.classList.add("hidden");
    authSwitch.classList.remove("hidden");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    favoritesHelper.textContent = "Login to manage favorites.";
    historyHelper.textContent = "Login to see search history.";
    favoritesList.innerHTML = "";
    historyList.innerHTML = "";
  }
};

const renderWeather = (payload) => {
  weatherCity.textContent = `${payload.city}${payload.country ? ", " + payload.country : ""}`;
  weatherDesc.textContent = payload.description || "--";
  weatherTemp.textContent = `${Math.round(payload.temperature)}°C`;
  weatherHumidity.textContent = payload.humidity ? `${payload.humidity}%` : "--";
  weatherWind.textContent = payload.windSpeed ? `${payload.windSpeed} m/s` : "--";
  if (payload.icon) {
    weatherIcon.src = `https://openweathermap.org/img/wn/${payload.icon}@2x.png`;
    weatherIcon.style.display = "block";
  } else {
    weatherIcon.style.display = "none";
  }
};

const renderList = (element, items, options = {}) => {
  element.innerHTML = "";
  if (!items || items.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = options.emptyText || "Nothing yet.";
    element.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    const city = document.createElement("span");
    city.textContent = `${item.city}${item.country ? ", " + item.country : ""}`;

    li.appendChild(city);

    if (options.onRemove) {
      const btn = document.createElement("button");
      btn.textContent = "Remove";
      btn.addEventListener("click", () => options.onRemove(item));
      li.appendChild(btn);
    }

    element.appendChild(li);
  });
};

const handleError = (element, message) => {
  element.textContent = message;
};

const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || "Request failed";
    throw new Error(message);
  }
  return data;
};

const loadUserData = async () => {
  try {
    const [favorites, history] = await Promise.all([
      apiFetch("/api/user/favorites"),
      apiFetch("/api/user/history"),
    ]);
    renderList(favoritesList, favorites.favorites, {
      emptyText: "No favorites yet.",
      onRemove: removeFavorite,
    });
    renderList(historyList, history.history, {
      emptyText: "No history yet.",
    });
  } catch (err) {
    renderList(favoritesList, [], { emptyText: "Login to manage favorites." });
    renderList(historyList, [], { emptyText: "Login to see search history." });
  }
};

const searchWeather = async () => {
  const city = cityInput.value.trim();
  if (!city) {
    handleError(weatherError, "Please enter a city name.");
    return;
  }

  weatherError.textContent = "";
  favoriteBtn.disabled = true;

  try {
    const data = await apiFetch(`/api/weather?city=${encodeURIComponent(city)}`, {
      method: "GET",
    });
    lastCityPayload = data;
    renderWeather(data);
    favoriteBtn.disabled = false;
    await loadUserData();
  } catch (err) {
    handleError(weatherError, err.message);
    favoriteBtn.disabled = true;
  }
};

const addFavorite = async () => {
  if (!lastCityPayload) {
    return handleError(weatherError, "Search for a city first.");
  }

  try {
    await apiFetch("/api/user/favorites", {
      method: "POST",
      body: JSON.stringify({ city: lastCityPayload.city }),
    });
    await loadUserData();
  } catch (err) {
    handleError(weatherError, err.message);
  }
};

const removeFavorite = async (item) => {
  try {
    await apiFetch(`/api/user/favorites/${item._id}`, {
      method: "DELETE",
    });
    await loadUserData();
  } catch (err) {
    handleError(weatherError, err.message);
  }
};

const handleLogin = async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    toggleAuthUI(true, data.user);
    await loadUserData();
  } catch (err) {
    handleError(loginError, err.message);
  }
};

const handleRegister = async (event) => {
  event.preventDefault();
  registerError.textContent = "";

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  try {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setToken(data.token);
    toggleAuthUI(true, data.user);
    await loadUserData();
  } catch (err) {
    handleError(registerError, err.message);
  }
};

const handleLogout = () => {
  clearToken();
  toggleAuthUI(false);
};

const initTabs = () => {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((btn) => btn.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.target;
      loginForm.classList.toggle("hidden", target !== "loginForm");
      registerForm.classList.toggle("hidden", target !== "registerForm");
    });
  });
};

searchBtn.addEventListener("click", searchWeather);
cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchWeather();
  }
});

favoriteBtn.addEventListener("click", addFavorite);
loginForm.addEventListener("submit", handleLogin);
registerForm.addEventListener("submit", handleRegister);
logoutBtn.addEventListener("click", handleLogout);

initTabs();

if (getToken()) {
  toggleAuthUI(true);
  loadUserData();
} else {
  toggleAuthUI(false);
}
