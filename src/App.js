import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [city, setCity] = useState("mumbai");
  const [weatherData, setWeatherData] = useState({});
  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/weather/?city=${city}`)
      .then((res) => {
        setWeatherData(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [city]);
  const handleCityChange = (event) => {
    setCity(event.target.value);
  };
  return (
    <div>
      <h1>Weather App</h1>
      <input type="text" value={city} onChange={handleCityChange} placeholder="Enter city" />
      <button>Search</button>
      {
        weatherData &&
        <div>
          <h2>{weatherData.city}</h2>
        </div>
      }
    </div>
  );
}

export default App;
