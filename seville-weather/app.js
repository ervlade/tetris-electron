// Seville coordinates
const LAT = 37.3886;
const LON = -5.9823;

const WEATHER_CODES = {
    0: { desc: 'Despejado', icon: '☀️' },
    1: { desc: 'Mayormente despejado', icon: '🌤️' },
    2: { desc: 'Parcialmente nublado', icon: '⛅' },
    3: { desc: 'Nublado', icon: '☁️' },
    45: { desc: 'Niebla', icon: '🌫️' },
    48: { desc: 'Niebla con escarcha', icon: '🌫️' },
    51: { desc: 'Llovizna ligera', icon: '🌦️' },
    53: { desc: 'Llovizna moderada', icon: '🌦️' },
    55: { desc: 'Llovizna intensa', icon: '🌧️' },
    56: { desc: 'Llovizna helada ligera', icon: '🌧️' },
    57: { desc: 'Llovizna helada intensa', icon: '🌧️' },
    61: { desc: 'Lluvia ligera', icon: '🌧️' },
    63: { desc: 'Lluvia moderada', icon: '🌧️' },
    65: { desc: 'Lluvia intensa', icon: '🌧️' },
    66: { desc: 'Lluvia helada ligera', icon: '🌨️' },
    67: { desc: 'Lluvia helada intensa', icon: '🌨️' },
    71: { desc: 'Nevada ligera', icon: '❄️' },
    73: { desc: 'Nevada moderada', icon: '❄️' },
    75: { desc: 'Nevada intensa', icon: '❄️' },
    77: { desc: 'Granos de nieve', icon: '🌨️' },
    80: { desc: 'Chubascos ligeros', icon: '🌦️' },
    81: { desc: 'Chubascos moderados', icon: '🌧️' },
    82: { desc: 'Chubascos intensos', icon: '🌧️' },
    85: { desc: 'Chubascos de nieve ligeros', icon: '🌨️' },
    86: { desc: 'Chubascos de nieve intensos', icon: '🌨️' },
    95: { desc: 'Tormenta', icon: '⛈️' },
    96: { desc: 'Tormenta con granizo ligero', icon: '⛈️' },
    99: { desc: 'Tormenta con granizo fuerte', icon: '⛈️' },
};

function getWeatherInfo(code) {
    return WEATHER_CODES[code] || { desc: 'Desconocido', icon: '❓' };
}

function windDirectionToText(degrees) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                  'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    const index = Math.round(degrees / 22.5) % 16;
    return dirs[index];
}

function formatTime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatHour(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(isoString) {
    const d = new Date(isoString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === tomorrow.toDateString()) return 'Mañana';

    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getUVLabel(uv) {
    if (uv <= 2) return 'Bajo';
    if (uv <= 5) return 'Moderado';
    if (uv <= 7) return 'Alto';
    if (uv <= 10) return 'Muy alto';
    return 'Extremo';
}

async function loadWeatherData() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    content.classList.add('hidden');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
        + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,uv_index`
        + `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m`
        + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max`
        + `&timezone=Europe/Madrid&forecast_days=7`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        renderCurrent(data.current, data.current_units);
        renderPrecipChart(data.hourly);
        renderHourly(data.hourly);
        renderDaily(data.daily);
        renderTempChart(data.hourly);
        renderSunInfo(data.daily);

        document.getElementById('lastUpdate').textContent =
            `Última actualización: ${new Date(data.current.time).toLocaleString('es-ES')}`;

        loading.classList.add('hidden');
        content.classList.remove('hidden');
    } catch (e) {
        console.error('Error loading weather data:', e);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

function renderCurrent(current, units) {
    const info = getWeatherInfo(current.weather_code);

    document.getElementById('currentIcon').textContent = info.icon;
    document.getElementById('currentTemp').textContent = Math.round(current.temperature_2m);
    document.getElementById('currentDesc').textContent = info.desc;
    document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('precipitation').textContent = `${current.precipitation} mm`;
    document.getElementById('wind').textContent = `${current.wind_speed_10m} km/h`;
    document.getElementById('gusts').textContent = `${current.wind_gusts_10m} km/h`;
    document.getElementById('windDir').textContent =
        `${windDirectionToText(current.wind_direction_10m)} (${current.wind_direction_10m}°)`;
    document.getElementById('pressure').textContent = `${current.pressure_msl} hPa`;

    const uv = current.uv_index;
    document.getElementById('uvIndex').textContent = `${uv} (${getUVLabel(uv)})`;
}

function renderPrecipChart(hourly) {
    const container = document.getElementById('precipChart');
    container.innerHTML = '';

    const now = new Date();
    const startIdx = hourly.time.findIndex(t => new Date(t) >= now);
    const hours = hourly.time.slice(startIdx, startIdx + 24);
    const precip = hourly.precipitation.slice(startIdx, startIdx + 24);
    const prob = hourly.precipitation_probability.slice(startIdx, startIdx + 24);

    const maxPrecip = Math.max(...precip, 0.5);

    hours.forEach((time, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'precip-bar-wrapper';

        const valEl = document.createElement('span');
        valEl.className = 'precip-value';
        valEl.textContent = precip[i] > 0 ? `${precip[i]}` : '';

        const bar = document.createElement('div');
        bar.className = 'precip-bar' + (precip[i] > 0 ? ' has-rain' : '');
        const height = precip[i] > 0 ? Math.max((precip[i] / maxPrecip) * 100, 3) : 0;
        bar.style.height = `${height}%`;

        const probEl = document.createElement('span');
        probEl.className = 'precip-prob';
        probEl.textContent = prob[i] > 0 ? `${prob[i]}%` : '';

        const hourEl = document.createElement('span');
        hourEl.className = 'precip-hour';
        hourEl.textContent = i % 3 === 0 ? formatHour(time) : '';

        wrapper.appendChild(valEl);
        wrapper.appendChild(bar);
        wrapper.appendChild(probEl);
        wrapper.appendChild(hourEl);
        container.appendChild(wrapper);
    });
}

function renderHourly(hourly) {
    const container = document.getElementById('hourlyForecast');
    container.innerHTML = '';

    const now = new Date();
    const startIdx = hourly.time.findIndex(t => new Date(t) >= now);

    for (let i = startIdx; i < startIdx + 24 && i < hourly.time.length; i++) {
        const info = getWeatherInfo(hourly.weather_code[i]);

        const item = document.createElement('div');
        item.className = 'hourly-item';
        item.innerHTML = `
            <div class="hourly-time">${i === startIdx ? 'Ahora' : formatHour(hourly.time[i])}</div>
            <div class="hourly-icon">${info.icon}</div>
            <div class="hourly-temp">${Math.round(hourly.temperature_2m[i])}°</div>
            <div class="hourly-precip">${hourly.precipitation_probability[i] > 0 ? hourly.precipitation_probability[i] + '%' : ''}</div>
            <div class="hourly-wind">${Math.round(hourly.wind_speed_10m[i])} km/h</div>
        `;
        container.appendChild(item);
    }
}

function renderDaily(daily) {
    const container = document.getElementById('dailyForecast');
    container.innerHTML = '';

    const allMin = Math.min(...daily.temperature_2m_min);
    const allMax = Math.max(...daily.temperature_2m_max);
    const range = allMax - allMin;

    daily.time.forEach((time, i) => {
        const info = getWeatherInfo(daily.weather_code[i]);
        const minT = daily.temperature_2m_min[i];
        const maxT = daily.temperature_2m_max[i];

        const barLeft = ((minT - allMin) / range) * 100;
        const barWidth = ((maxT - minT) / range) * 100;

        const precipText = daily.precipitation_sum[i] > 0
            ? `💧 ${daily.precipitation_sum[i]} mm`
            : daily.precipitation_probability_max[i] > 0
                ? `💧 ${daily.precipitation_probability_max[i]}%`
                : '';

        const item = document.createElement('div');
        item.className = 'daily-item';
        item.innerHTML = `
            <div class="daily-day">${formatDay(time)}</div>
            <div class="daily-icon">${info.icon}</div>
            <div class="daily-temps">
                <span class="daily-temp-min">${Math.round(minT)}°</span>
                <div class="daily-temp-bar-container">
                    <div class="daily-temp-bar" style="left:${barLeft}%;width:${Math.max(barWidth, 4)}%"></div>
                </div>
                <span class="daily-temp-max">${Math.round(maxT)}°</span>
            </div>
            <div class="daily-precip">${precipText}</div>
        `;
        container.appendChild(item);
    });
}

function renderTempChart(hourly) {
    const container = document.getElementById('tempChart');
    container.innerHTML = '';

    const now = new Date();
    const startIdx = hourly.time.findIndex(t => new Date(t) >= now);
    const temps = hourly.temperature_2m.slice(startIdx, startIdx + 24);
    const times = hourly.time.slice(startIdx, startIdx + 24);

    const minTemp = Math.min(...temps) - 1;
    const maxTemp = Math.max(...temps) + 1;
    const range = maxTemp - minTemp;

    const width = 900;
    const height = 140;
    const padding = { top: 25, bottom: 30, left: 10, right: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const points = temps.map((t, i) => {
        const x = padding.left + (i / (temps.length - 1)) * chartW;
        const y = padding.top + (1 - (t - minTemp) / range) * chartH;
        return { x, y, temp: t, time: times[i] };
    });

    const pathData = points.map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cpx1 = prev.x + (p.x - prev.x) / 3;
        const cpx2 = p.x - (p.x - prev.x) / 3;
        return `C ${cpx1} ${prev.y} ${cpx2} ${p.y} ${p.x} ${p.y}`;
    }).join(' ');

    const areaPath = pathData
        + ` L ${points[points.length - 1].x} ${height - padding.bottom}`
        + ` L ${points[0].x} ${height - padding.bottom} Z`;

    let labels = '';
    points.forEach((p, i) => {
        if (i % 4 === 0) {
            labels += `<text x="${p.x}" y="${height - 8}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10">${formatHour(p.time)}</text>`;
        }
        if (i % 3 === 0) {
            labels += `<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="11" font-weight="600">${Math.round(p.temp)}°</text>`;
        }
    });

    const svg = `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#f5af19" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#f5af19" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <path d="${areaPath}" fill="url(#tempGrad)"/>
            <path d="${pathData}" fill="none" stroke="#f5af19" stroke-width="2.5" stroke-linecap="round"/>
            ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#f5af19"/>`).join('')}
            ${labels}
        </svg>
    `;

    container.innerHTML = svg;
}

function renderSunInfo(daily) {
    const container = document.getElementById('sunInfo');
    container.innerHTML = '';

    const sunrise = daily.sunrise[0];
    const sunset = daily.sunset[0];

    const sunriseDate = new Date(sunrise);
    const sunsetDate = new Date(sunset);
    const daylight = sunsetDate - sunriseDate;
    const hours = Math.floor(daylight / 3600000);
    const mins = Math.floor((daylight % 3600000) / 60000);

    container.innerHTML = `
        <div class="sun-item">
            <div class="sun-icon">🌅</div>
            <div class="sun-label">Amanecer</div>
            <div class="sun-time">${formatTime(sunrise)}</div>
        </div>
        <div class="sun-item">
            <div class="sun-icon">🌇</div>
            <div class="sun-label">Atardecer</div>
            <div class="sun-time">${formatTime(sunset)}</div>
        </div>
        <div class="sun-item">
            <div class="sun-icon">☀️</div>
            <div class="sun-label">Horas de luz</div>
            <div class="sun-time">${hours}h ${mins}m</div>
        </div>
    `;
}

// Load data on page load
loadWeatherData();

// Auto-refresh every 10 minutes
setInterval(loadWeatherData, 10 * 60 * 1000);
