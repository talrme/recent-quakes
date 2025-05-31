// Initialize the map
const map = L.map('map').setView([0, -90], 3);

// Add the OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add title to the map
const titleControl = L.control({ position: 'topleft' });
titleControl.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'map-title-container');
    const title = L.DomUtil.create('div', 'map-title', div);
    title.innerHTML = '<span class="title-icon">🌍</span><span class="title-text">Recent Quakes</span>';
    return div;
};
titleControl.addTo(map);

// Store markers for easy removal
let markers = [];

// Store reference to the strongest and most recent earthquake markers
let strongestMarker = null;
let mostRecentMarker = null;

// Store reference to the current popup and overlay
let currentPopup = null;
let currentOverlay = null;

// Store current sort preference
let currentSortBy = 'time'; // 'time' or 'magnitude'

// Function to get color based on magnitude
function getColor(magnitude) {
    return magnitude > 6 ? '#d73027' :
           magnitude > 5 ? '#fc8d59' :
           magnitude > 4 ? '#fee090' :
           magnitude > 3 ? '#e0f3f8' :
           '#91bfdb';
}

// Function to get radius based on magnitude - now using fixed size
function getRadius(magnitude) {
    return 8; // Fixed size for all markers
}

// Function to format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

// Function to format location
function formatLocation(place) {
    // Handle cases where place is undefined or empty
    if (!place || place === 'Unknown location') return place;
    
    // Common patterns in USGS data, including compound directions
    const patterns = [
        // Pattern 1: "X km Direction of Location"
        /(\d+)\s*km\s+([NSWE]|NE|NW|SE|SW|NNE|NNW|ENE|WNW|ESE|WSW|SSE|SSW)\s+of\s+(.+)/i,
        // Pattern 2: "X km Direction Location"
        /(\d+)\s*km\s+([NSWE]|NE|NW|SE|SW|NNE|NNW|ENE|WNW|ESE|WSW|SSE|SSW)\s+(.+)/i,
        // Pattern 3: "Location X km Direction"
        /(.+?)\s+(\d+)\s*km\s+([NSWE]|NE|NW|SE|SW|NNE|NNW|ENE|WNW|ESE|WSW|SSE|SSW)\b/i,
        // Pattern 4: "X Direction of Location"
        /(\d+)\s+([NSWE]|NE|NW|SE|SW|NNE|NNW|ENE|WNW|ESE|WSW|SSE|SSW)\s+of\s+(.+)/i,
        // Pattern 5: "Location X Direction"
        /(.+?)\s+(\d+)\s+([NSWE]|NE|NW|SE|SW|NNE|NNW|ENE|WNW|ESE|WSW|SSE|SSW)\b/i
    ];

    for (const pattern of patterns) {
        const match = place.match(pattern);
        if (match) {
            let location, distance, direction;
            
            // Extract components based on pattern
            if (pattern.toString().includes('Location X')) {
                // Patterns 3 and 5: Location first
                [_, location, distance, direction] = match;
            } else {
                // Patterns 1, 2, and 4: Distance and direction first
                [_, distance, direction, location] = match;
            }
            
            // Keep the direction in its abbreviated form
            direction = direction.toUpperCase();
            
            // Return in consistent format: "Location - X km Direction"
            return `${location} - ${distance} km ${direction}`;
        }
    }
    
    // If no pattern matches, return the original place
    return place;
}

// Function to create the legend
function createLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        const magnitudes = [0, 3, 4, 5, 6];
        const labels = [];
        
        // Add title
        div.innerHTML = '<h4>Magnitude</h4>';
        
        // Add magnitude ranges
        for (let i = 0; i < magnitudes.length; i++) {
            const from = magnitudes[i];
            const to = magnitudes[i + 1];
            
            labels.push(
                '<div class="legend-item">' +
                '<i style="background:' + getColor(from + 1) + '"></i> ' +
                from + (to ? '&ndash;' + to : '+') +
                '</div>'
            );
        }
        
        div.innerHTML += labels.join('');
        return div;
    };
    
    legend.addTo(map);
}

// Function to calculate energy release in tons of TNT
function calculateEnergy(magnitude) {
    // Using the Gutenberg-Richter energy-magnitude relation
    // log10(E) = 1.5*M + 4.8, where E is in ergs
    // 1 ton of TNT = 4.184 × 10^16 ergs
    const energyInErgs = Math.pow(10, 1.5 * magnitude + 4.8);
    return energyInErgs / (4.184 * Math.pow(10, 16));
}

// Function to format time since
function formatTimeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Function to calculate statistics from earthquake data
function calculateStats(earthquakes) {
    if (!earthquakes || earthquakes.length === 0) {
        return {
            total: 0,
            maxMagnitude: 0,
            energyRelease: 0,
            timeSinceLast: 'N/A',
            recentCount: 0
        };
    }

    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    const stats = {
        total: earthquakes.length,
        maxMagnitude: 0,
        energyRelease: 0,
        timeSinceLast: '',
        recentCount: 0
    };

    let totalEnergy = 0;
    let mostRecentTime = new Date(0);

    earthquakes.forEach(quake => {
        const magnitude = quake.properties.mag || 0;
        const time = new Date(quake.properties.time);

        totalEnergy += calculateEnergy(magnitude);

        if (magnitude > stats.maxMagnitude) {
            stats.maxMagnitude = magnitude;
        }

        if (time > mostRecentTime) {
            mostRecentTime = time;
        }

        if (time > oneDayAgo) {
            stats.recentCount++;
        }
    });

    stats.energyRelease = totalEnergy;
    stats.timeSinceLast = formatTimeSince(mostRecentTime);

    return stats;
}

// Function to create the stats box
function createStatsBox() {
    const statsBox = L.control({ position: 'bottomleft' });
    
    statsBox.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info stats-box');
        div.id = 'stats-box';
        return div;
    };
    
    statsBox.addTo(map);
    return statsBox;
}

// Function to highlight a marker
function highlightMarker(marker, isStrongest = false) {
    console.log(`Highlighting ${isStrongest ? 'strongest' : 'most recent'} earthquake:`, marker);
    
    // Remove pulsing effect from previous markers if they exist
    if (isStrongest && strongestMarker) {
        console.log('Removing highlight from previous strongest marker');
        strongestMarker.setStyle({
            className: '',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });
    }
    if (!isStrongest && mostRecentMarker) {
        console.log('Removing highlight from previous most recent marker');
        mostRecentMarker.setStyle({
            className: '',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });
    }

    // Add pulsing effect to new marker
    console.log('Adding highlight to new marker');
    marker.setStyle({
        className: 'pulsing-marker',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
    });
    
    // Bring marker to front
    marker.bringToFront();
    
    // Update the appropriate marker reference
    if (isStrongest) {
        strongestMarker = marker;
    } else {
        mostRecentMarker = marker;
    }

    // Center map on the marker with a smooth animation
    console.log('Centering map on marker');
    map.flyTo(marker.getLatLng(), 8, {
        duration: 1.5
    });

    // Open the popup after a short delay to ensure the marker is visible
    setTimeout(() => {
        console.log('Opening popup');
        marker.openPopup();
    }, 1000);

    // Minimize the popup if it's open and exists
    if (currentPopup && currentPopup.parentElement) {
        currentPopup.classList.add('minimized');
        // Remove the overlay when minimizing
        if (currentOverlay) {
            currentOverlay.remove();
            currentOverlay = null;
        }
        // Update button state
        updateMinimizeButtonState(true);
    }
}

// Function to update minimize button state
function updateMinimizeButtonState(isMinimized) {
    const minimizeButton = currentPopup?.querySelector('#minimize-popup');
    if (minimizeButton) {
        minimizeButton.innerHTML = isMinimized ? '◀' : '▶';
        minimizeButton.title = isMinimized ? 'Maximize' : 'Minimize';
    }
}

// Function to create and show the recent earthquakes popup
function showRecentEarthquakesPopup(earthquakes) {
    // Remove existing popup and overlay if they exist
    if (currentPopup) currentPopup.remove();
    if (currentOverlay) currentOverlay.remove();

    // Create overlay
    currentOverlay = document.createElement('div');
    currentOverlay.className = 'popup-overlay';
    document.body.appendChild(currentOverlay);

    // Create popup container
    currentPopup = document.createElement('div');
    currentPopup.id = 'recent-earthquakes-popup';
    currentPopup.className = 'recent-earthquakes-popup';

    // Add popup to the page first
    document.body.appendChild(currentPopup);

    // Then update its content
    updatePopupContent(earthquakes);

    // Initialize button state
    updateMinimizeButtonState(false);

    // Only close popup when clicking the close button or the overlay (when popup is not minimized)
    const handleOverlayClick = (e) => {
        if (e.target === currentOverlay && !currentPopup.classList.contains('minimized')) {
            closePopup();
        }
    };

    // Add click handler to the overlay
    currentOverlay.addEventListener('click', handleOverlayClick);

    // Add click handler to the document to prevent closing when clicking the map
    document.addEventListener('click', (e) => {
        // If popup doesn't exist, do nothing
        if (!currentPopup) return;
        
        // If clicking outside both popup and overlay, and popup is minimized, do nothing
        if (currentPopup.classList.contains('minimized')) {
            return;
        }
        
        // If clicking the overlay (not the map), handle it
        if (e.target === currentOverlay) {
            if (currentPopup && !currentPopup.classList.contains('minimized')) {
                closePopup();
            }
        }
    });
}

// Function to close popup and overlay
function closePopup() {
    if (currentPopup) {
        currentPopup.remove();
    }
    if (currentOverlay) {
        currentOverlay.remove();
    }
    currentPopup = null;
    currentOverlay = null;
}

// Function to update popup content
function updatePopupContent(earthquakes) {
    if (!currentPopup) return;

    // Sort earthquakes based on current preference
    const sortedQuakes = [...earthquakes].sort((a, b) => {
        if (currentSortBy === 'time') {
            return new Date(b.properties.time) - new Date(a.properties.time);
        } else {
            return (b.properties.mag || 0) - (a.properties.mag || 0);
        }
    });

    // Create popup content
    currentPopup.innerHTML = `
        <div class="recent-earthquakes-header">
            <div class="header-left">
                <h3>Quake List</h3>
                <div class="sort-toggle">
                    <div class="sort-toggle-track">
                        <button class="sort-toggle-option ${currentSortBy === 'time' ? 'active' : ''}" data-sort="time">
                            <span class="sort-icon">🕒</span> Time
                        </button>
                        <button class="sort-toggle-option ${currentSortBy === 'magnitude' ? 'active' : ''}" data-sort="magnitude">
                            <span class="sort-icon">💥</span> Magnitude
                        </button>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <button class="minimize-button" id="minimize-popup" title="Minimize">▶</button>
                <button class="close-button" id="close-recent-popup">&times;</button>
            </div>
        </div>
        <div class="recent-earthquakes-list">
            ${sortedQuakes.map((quake, index) => {
                const magnitude = quake.properties?.mag || 0;
                const place = quake.properties?.place || 'Unknown location';
                const time = new Date(quake.properties?.time || Date.now());
                const coordinates = quake.geometry?.coordinates || [0, 0, 0];
                const id = quake.id || '';
                
                return `
                    <div class="recent-earthquake-item" data-index="${index}">
                        <div class="recent-earthquake-magnitude" style="background-color: ${getColor(magnitude)}">
                            ${magnitude.toFixed(1)}
                        </div>
                        <div class="recent-earthquake-info">
                            <div class="recent-earthquake-place">${formatLocation(place)}</div>
                            <div class="recent-earthquake-time">${formatTimeSince(time)}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Add click handler for close button
    const closeButton = currentPopup.querySelector('#close-recent-popup');
    if (closeButton) {
        closeButton.addEventListener('click', closePopup);
    }

    // Add click handler for minimize button
    const minimizeButton = currentPopup.querySelector('#minimize-popup');
    if (minimizeButton) {
        minimizeButton.addEventListener('click', () => {
            if (!currentPopup) return;
            
            const isMinimized = currentPopup.classList.contains('minimized');
            if (isMinimized) {
                // Maximize
                currentPopup.classList.remove('minimized');
                // Add back the overlay
                if (!currentOverlay) {
                    currentOverlay = document.createElement('div');
                    currentOverlay.className = 'popup-overlay';
                    document.body.appendChild(currentOverlay);
                }
            } else {
                // Minimize
                currentPopup.classList.add('minimized');
                // Remove the overlay
                if (currentOverlay) {
                    currentOverlay.remove();
                    currentOverlay = null;
                }
            }
            // Update button state after class change
            updateMinimizeButtonState(!isMinimized);
        });
    }

    // Update sort toggle handlers
    currentPopup.querySelectorAll('.sort-toggle-option').forEach(button => {
        button.addEventListener('click', () => {
            const newSort = button.dataset.sort;
            if (newSort !== currentSortBy) {
                currentSortBy = newSort;
                // Update active state
                currentPopup.querySelectorAll('.sort-toggle-option').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.sort === newSort);
                });
                updatePopupContent(earthquakes); // Re-render with new sort
            }
        });
    });

    // Add click handlers for each earthquake item
    currentPopup.querySelectorAll('.recent-earthquake-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            const quake = sortedQuakes[index];
            const coordinates = quake.geometry?.coordinates || [0, 0, 0];
            const marker = markers.find(m => 
                m.getLatLng().lat === coordinates[1] && 
                m.getLatLng().lng === coordinates[0]
            );
            
            if (marker) {
                highlightMarker(marker, false);
            }
        });
    });
}

// Function to update stats box content
function updateStatsBox(stats) {
    const statsBox = document.getElementById('stats-box');
    if (!statsBox) return;

    // Format energy release to be more readable
    let energyText;
    if (stats.energyRelease >= 1000000) {
        energyText = `${(stats.energyRelease / 1000000).toFixed(1)}M tons TNT`;
    } else if (stats.energyRelease >= 1000) {
        energyText = `${(stats.energyRelease / 1000).toFixed(1)}K tons TNT`;
    } else {
        energyText = `${stats.energyRelease.toFixed(1)} tons TNT`;
    }

    statsBox.innerHTML = `
        <h4>Quake Stats</h4>
        <div class="stats-content">
            <div class="stat-item">
                <span class="stat-label">Total Earthquakes:</span>
                <span class="stat-value clickable" id="total-value">${stats.total}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Last 24 Hours:</span>
                <span class="stat-value">${stats.recentCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Strongest:</span>
                <span class="stat-value clickable" id="strongest-value">${stats.maxMagnitude.toFixed(1)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Energy Release:</span>
                <span class="stat-value">${energyText}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Last Earthquake:</span>
                <span class="stat-value clickable" id="recent-value">${stats.timeSinceLast}</span>
            </div>
        </div>
    `;

    // Add click handlers
    const strongestValue = document.getElementById('strongest-value');
    const recentValue = document.getElementById('recent-value');
    const totalValue = document.getElementById('total-value');

    if (strongestValue) {
        console.log('Adding click handler to strongest value');
        strongestValue.addEventListener('click', () => {
            console.log('Strongest value clicked, current strongest marker:', strongestMarker);
            if (strongestMarker) {
                highlightMarker(strongestMarker, true);
            } else {
                console.log('No strongest marker found!');
            }
        });
    }

    if (recentValue) {
        console.log('Adding click handler to most recent value');
        recentValue.addEventListener('click', () => {
            console.log('Most recent value clicked, current most recent marker:', mostRecentMarker);
            if (mostRecentMarker) {
                highlightMarker(mostRecentMarker, false);
            } else {
                console.log('No most recent marker found!');
            }
        });
    }

    if (totalValue) {
        console.log('Adding click handler to total value');
        totalValue.addEventListener('click', () => {
            showRecentEarthquakesPopup(window.currentEarthquakes || []);
        });
    }
}

// Function to fetch earthquake data
async function fetchEarthquakeData(days, minMagnitude) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDate.toISOString()}&endtime=${endDate.toISOString()}&minmagnitude=${minMagnitude}`;
    
    console.log('Fetching data from:', url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Received data:', data);
        if (!data.features || data.features.length === 0) {
            console.log('No earthquake data found for the selected parameters');
        } else {
            console.log(`Found ${data.features.length} earthquakes`);
        }
        return data.features;
    } catch (error) {
        console.error('Error fetching earthquake data:', error);
        return [];
    }
}

// Debounce function to limit how often a function can be called
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Function to update the map with new data
async function updateMap() {
    console.log('Updating map...');
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];
    strongestMarker = null;
    mostRecentMarker = null;

    const days = parseInt(document.getElementById('days-slider').value);
    const minMagnitude = parseFloat(document.getElementById('magnitude-slider').value);
    
    console.log(`Fetching earthquakes for last ${days} days with minimum magnitude ${minMagnitude}`);

    const earthquakes = await fetchEarthquakeData(days, minMagnitude);
    // Store current earthquakes for the recent popup
    window.currentEarthquakes = earthquakes;
    
    // Update statistics
    const stats = calculateStats(earthquakes);
    updateStatsBox(stats);

    // Find the strongest and most recent earthquakes
    let maxMagnitude = -1;
    let strongestQuakeIndex = -1;
    let mostRecentTime = 0;
    let mostRecentIndex = -1;

    earthquakes.forEach((quake, index) => {
        const magnitude = quake.properties?.mag || 0;
        const time = new Date(quake.properties?.time || 0).getTime();

        if (magnitude > maxMagnitude) {
            maxMagnitude = magnitude;
            strongestQuakeIndex = index;
        }
        if (time > mostRecentTime) {
            mostRecentTime = time;
            mostRecentIndex = index;
        }
    });

    console.log('Strongest earthquake index:', strongestQuakeIndex, 'with magnitude:', maxMagnitude);
    console.log('Most recent earthquake index:', mostRecentIndex, 'with time:', new Date(mostRecentTime));

    earthquakes.forEach((quake, index) => {
        // Safely access properties with fallbacks
        const coordinates = quake.geometry?.coordinates || [0, 0, 0];
        const properties = quake.properties || {};
        const magnitude = properties.mag || 0;
        const place = properties.place || 'Unknown location';
        const time = properties.time || Date.now();

        // Create custom marker
        const marker = L.circleMarker([coordinates[1], coordinates[0]], {
            radius: getRadius(magnitude),
            fillColor: getColor(magnitude),
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
            magnitude: magnitude // Store magnitude for later reference
        });

        // Create popup content with external link
        const popupContent = `
            <div class="earthquake-popup">
                <h3>${formatLocation(place)}</h3>
                <p><strong>Magnitude:</strong> ${magnitude.toFixed(1)}</p>
                <p><strong>Time:</strong> ${formatDate(time)}</p>
                <p><strong>Depth:</strong> ${coordinates[2].toFixed(2)} km</p>
                <p><strong>More Info:</strong> <a href="https://earthquake.usgs.gov/earthquakes/eventpage/${quake.id}" 
                   target="_blank" 
                   rel="noopener noreferrer">USGS Event Page</a></p>
            </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(map);
        markers.push(marker);

        // Store references to strongest and most recent markers
        if (index === strongestQuakeIndex) {
            console.log('Setting strongest marker:', marker);
            strongestMarker = marker;
        }
        if (index === mostRecentIndex) {
            console.log('Setting most recent marker:', marker);
            mostRecentMarker = marker;
        }
    });
    
    console.log(`Added ${markers.length} markers to the map`);
    console.log('Strongest marker reference:', strongestMarker);
    console.log('Most recent marker reference:', mostRecentMarker);

    // Update popup content if it's open
    if (currentPopup && currentPopup.parentElement) {
        console.log('Updating popup content with new earthquake data');
        updatePopupContent(earthquakes);
    }
}

// Create debounced version of updateMap
const debouncedUpdateMap = debounce(updateMap, 500);

// Add event listeners for sliders
document.getElementById('days-slider').addEventListener('input', (e) => {
    document.getElementById('days-value').textContent = e.target.value;
    debouncedUpdateMap();
});

document.getElementById('magnitude-slider').addEventListener('input', (e) => {
    document.getElementById('magnitude-value').textContent = e.target.value;
    debouncedUpdateMap();
});

// Create legend, stats box and initial map update
createLegend();
createStatsBox();
updateMap(); // Initial update without debouncing

// Add event listener for the controls recent earthquakes link
document.addEventListener('DOMContentLoaded', () => {
    const controlsRecentLink = document.getElementById('controls-recent-link');
    if (controlsRecentLink) {
        controlsRecentLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRecentEarthquakesPopup(window.currentEarthquakes || []);
        });
    }
});

// The minimize button event listener is already properly set up in updatePopupContent
// around line 300, so we don't need to add it again 