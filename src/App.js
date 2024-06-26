// App.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [city, setCity] = useState("Mumbai");

  const fetchWeatherData = async (city) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/api/data?city=${city}`
      );
      setWeatherData(response.data);
    } catch (error) {
      console.error("Error fetching the weather data", error);
    }
  };

  useEffect(() => {
    fetchWeatherData(city);
  }, [city]);

  if (!weatherData) {
    return <div>Loading...</div>;
  }
  const handleInputChange = (e) => {
    setCity(e.target.value);
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-center">
        <div className="row">
          <input type="text" value={city} onChange={handleInputChange} />
        </div>
      </div>
      <div className="mt-5" style={{backgroundImage:`url(${weatherData.bg_image})`}}>
      <div className="row">
        <div className="col-md-6">
          <h1>{city}</h1>
        </div>
      </div>
      <p>Current Weather: {weatherData.current_weather}</p>
      <p>Temperature: {weatherData.temperature}</p>
      <p>Humidity: {weatherData.humidity}</p>
      </div>
    </div>
  );
};

export default App;
