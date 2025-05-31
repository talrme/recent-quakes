# 🌍 [View Live Website](https://talrme.github.io/recent-quakes/)

---

# Live Earthquake Map

An interactive web application that displays recent earthquakes around the world in real-time. Built with vanilla JavaScript and Leaflet.js.

## Features

- **Real-time Data**: Fetches earthquake data from the USGS API
- **Interactive Map**: 
  - Click markers to view detailed earthquake information
  - Hover over markers to see magnitude and location
  - Smooth animations when focusing on earthquakes
- **Customizable View**:
  - Adjust time range (1-30 days)
  - Filter by minimum magnitude (0-7+)
  - Sort earthquakes by time or magnitude
- **Earthquake List**:
  - View all earthquakes in a scrollable list
  - Click to focus on the map
  - Minimizable panel for better map visibility
- **Statistics**:
  - Total number of earthquakes
  - Count in last 24 hours
  - Strongest earthquake
  - Total energy release
  - Time since last earthquake
- **Responsive Design**:
  - Works on desktop and mobile devices
  - Adjusts layout for different screen sizes

## Live Demo

Visit the live website at [https://talrme.github.io/recent-quakes/](https://talrme.github.io/recent-quakes/)

## Local Development

1. Clone the repository:
   ```bash
   git clone [repository-url]
   ```

2. Open `index.html` in your browser or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve
   ```

3. Open `http://localhost:8000` in your browser

## Technologies Used

- **Frontend**:
  - Vanilla JavaScript
  - HTML5
  - CSS3
- **Libraries**:
  - [Leaflet.js](https://leafletjs.com/) for interactive maps
  - [OpenStreetMap](https://www.openstreetmap.org/) for map tiles
- **APIs**:
  - [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/)

## Project Structure

```
earthquakes/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── script.js           # Main application logic
└── README.md          # This file
```

## Usage

1. **Viewing Earthquakes**:
   - The map shows earthquake locations with color-coded markers
   - Marker size indicates magnitude
   - Click markers for detailed information

2. **Controls**:
   - Use the sliders to adjust time range and minimum magnitude
   - Click "Quake List" to view all earthquakes
   - Use the sort toggle to switch between time and magnitude sorting

3. **Earthquake List**:
   - View all earthquakes in a scrollable list
   - Click any earthquake to focus on the map
   - Minimize the list for better map visibility
   - Sort by time or magnitude

4. **Statistics**:
   - View key statistics in the bottom-left panel
   - Click on statistics to focus on relevant earthquakes
   - Total earthquakes count opens the full list

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- USGS for providing the earthquake data
- OpenStreetMap for map tiles
- Leaflet.js for the mapping library 