// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
    const [weatherData, setWeatherData] = useState(null);
    const [city, setCity] = useState('Mumbai');

    const fetchWeatherData = async (city) => {
        try {
            const response = await axios.get(`http://127.0.0.1:5000/api/data?city=${city}`);
            setWeatherData(response.data);
        } catch (error) {
            console.error('Error fetching the weather data', error);
        }
    };

    useEffect(() => {
        fetchWeatherData(city);
    }, [city]);

    if (!weatherData) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Weather in {city}</h1>
            <p>Current Weather: {weatherData.current_weather}</p>
            <p>Temperature: {weatherData.temperature}</p>
            <p>Humidity: {weatherData.humidity}</p>
            <img src={weatherData.bg_image} alt="Weather background" />
            <div>
                <label>Select city: </label>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Delhi">Delhi</option>
                </select>
            </div>
        </div>
    );
};

export default App;
