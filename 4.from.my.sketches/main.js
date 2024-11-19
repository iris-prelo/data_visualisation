import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Adjust width to be relative to viewport
const width = window.innerWidth * 0.8; // 80% of viewport width
const circleSpacing = 270; // Spacing between circles
const topPadding = 150; // Increased top padding to prevent cut-off

async function fetchData() {
  try {
    const url = "./food.json";
    let response = await fetch(url);

    if (response.ok) {
      let json = await response.json();
      const filteredData = filterData(json);
      drawCircles(filteredData);
    } else {
      alert("HTTP-Error: " + response.status);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function filterData(data) {
  return Object.entries(data).map(([name, values]) => {
    const totalEmission = values[0].food_emissions_land_use +
      values[0].food_emissions_farm +
      values[0].food_emissions_animal_feed +
      values[0].food_emissions_processing +
      values[0].food_emissions_transport +
      values[0].food_emissions_retail +
      values[0].food_emissions_packaging +
      values[0].food_emissions_losses;
    
    return {
      name: name,
      emission: totalEmission
    };
  }).sort((a, b) => b.emission - a.emission);
}

function drawCircles(data) {
  // Calculate height based on number of items and spacing
  const height = (data.length * circleSpacing) + topPadding; // Added more padding

  // Clear previous SVG
  d3.select("#container").selectAll("svg").remove();

  // Create centered SVG
  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("margin", "0 auto")
    .style("display", "block");

  const circleDiameterScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.emission)])
    .range([50, 240]);

  const colorScale = d3.scaleLinear()
    .domain([
      0, 
      d3.max(data, d => d.emission) / 2,
      d3.max(data, d => d.emission)
    ])
    .range(["green", "blue", "pink"]);

  // Create a group for all circles
  const circleGroup = svg.append("g")
    .attr("transform", `translate(${width/2}, ${topPadding})`); // Increased top padding

  const circles = circleGroup.selectAll("g")
    .data(data)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0, ${i * circleSpacing})`);

  circles.append("circle")
    .attr("r", d => circleDiameterScale(d.emission) / 2)
    .attr("fill", d => colorScale(d.emission))
    .append("title")
    .text(d => `Food: ${d.name}\nTotal Emissions: ${d.emission.toFixed(2)} kg CO2eq/kg`);

  circles.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", d => circleDiameterScale(d.emission) / 2 + 20)
    .style("font-size", "14px")
    .text(d => d.name);
}

// Call fetchData when window loads
fetchData();

// Update visualization when window is resized
window.addEventListener('resize', () => {
  fetchData();
});