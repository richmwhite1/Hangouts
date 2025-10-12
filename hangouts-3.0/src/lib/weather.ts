import { logger } from '@/lib/logger'
// Free weather service using OpenWeatherMap (requires free API key)
// For demo purposes, we'll use a mock weather service

export interface WeatherData {
  temperature: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
  feelsLike: number
  location: string
}

export interface WeatherForecast {
  date: string
  temperature: {
    min: number
    max: number
  }
  description: string
  icon: string
  precipitation: number
}

// Mock weather data for demo purposes
const mockWeatherData: WeatherData = {
  temperature: 22,
  description: 'Partly cloudy',
  icon: '⛅',
  humidity: 65,
  windSpeed: 12,
  feelsLike: 24,
  location: 'Current Location'
}

const mockForecast: WeatherForecast[] = [
  {
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    temperature: { min: 18, max: 25 },
    description: 'Sunny',
    icon: '☀️',
    precipitation: 0
  },
  {
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    temperature: { min: 16, max: 23 },
    description: 'Light rain',
    icon: '🌦️',
    precipitation: 2
  },
  {
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    temperature: { min: 19, max: 26 },
    description: 'Clear sky',
    icon: '☀️',
    precipitation: 0
  }
]

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
  // In a real implementation, you would call OpenWeatherMap API here
  // For demo purposes, we'll return mock data
  
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Add some randomness to make it feel more realistic
    const randomTemp = mockWeatherData.temperature + Math.floor(Math.random() * 6) - 3
    const randomHumidity = mockWeatherData.humidity + Math.floor(Math.random() * 20) - 10
    
    return {
      ...mockWeatherData,
      temperature: Math.max(0, randomTemp),
      humidity: Math.max(0, Math.min(100, randomHumidity)),
      feelsLike: Math.max(0, randomTemp + Math.floor(Math.random() * 4) - 2)
    }
  } catch (error) {
    logger.error('Weather API error:', error);
    return mockWeatherData
  }
}

export async function getWeatherForecast(latitude: number, longitude: number): Promise<WeatherForecast[]> {
  // In a real implementation, you would call OpenWeatherMap API here
  // For demo purposes, we'll return mock data
  
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return mockForecast
  } catch (error) {
    logger.error('Weather forecast API error:', error);
    return mockForecast
  }
}

export function getWeatherIcon(description: string): string {
  const iconMap: { [key: string]: string } = {
    'clear sky': '☀️',
    'few clouds': '⛅',
    'scattered clouds': '☁️',
    'broken clouds': '☁️',
    'shower rain': '🌦️',
    'rain': '🌧️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'mist': '🌫️',
    'partly cloudy': '⛅',
    'light rain': '🌦️',
    'sunny': '☀️'
  }
  
  return iconMap[description.toLowerCase()] || '🌤️'
}

export function getWeatherAdvice(weather: WeatherData, isOutdoor: boolean): string {
  if (!isOutdoor) return ''
  
  const temp = weather.temperature
  const description = weather.description.toLowerCase()
  
  if (temp < 10) {
    return 'Bundle up! It\'s quite cold outside.'
  } else if (temp > 30) {
    return 'Stay hydrated! It\'s hot out there.'
  } else if (description.includes('rain') || description.includes('storm')) {
    return 'Consider bringing an umbrella or rain gear.'
  } else if (description.includes('snow')) {
    return 'Dress warmly and watch for icy conditions.'
  } else if (weather.windSpeed > 20) {
    return 'It\'s quite windy - secure any loose items.'
  } else if (temp >= 15 && temp <= 25 && !description.includes('rain')) {
    return 'Perfect weather for outdoor activities!'
  }
  
  return 'Check the weather before heading out.'
}





























