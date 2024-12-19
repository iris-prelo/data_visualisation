import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = window.innerWidth * 0.8;
const circleSpacing = 300;
const topPadding = 200;

// Define emission categories and their colors
const emissionCategories = [
  'food_emissions_land_use',
  'food_emissions_farm',
  'food_emissions_animal_feed',
  'food_emissions_processing',
  'food_emissions_transport',
  'food_emissions_retail',
  'food_emissions_packaging',
  'food_emissions_losses'
];

const categoryColors = [
  "#FF9999", // red-ish
  "#99FF99", // green-ish
  "#9999FF", // blue-ish
  "#FFFF99", // yellow-ish
  "#FF99FF", // purple-ish
  "#99FFFF", // cyan-ish
  "#FFB366", // orange-ish
  "#B366FF"  // violet-ish
];

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
    // Store individual emissions for sub-bubbles
    const emissions = {
      name: name,
      emission: 0,
      categories: {}
    };
    
    emissionCategories.forEach(category => {
      emissions.categories[category] = values[0][category];
      emissions.emission += values[0][category];
    });
    
    return emissions;
  }).sort((a, b) => b.emission - a.emission);
}

function drawCircles(data) {
  const height = (data.length * circleSpacing) + topPadding;

  d3.select("#container").selectAll("svg").remove();

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
    .domain([0, d3.max(data, d => d.emission) / 2, d3.max(data, d => d.emission)])
    .range(["green", "blue", "pink"]);

  // Scale for sub-bubbles
  const subBubbleScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.emission)])
    .range([5, 90]);

  const circleGroup = svg.append("g")
    .attr("transform", `translate(${width/2}, ${topPadding})`);

  const circles = circleGroup.selectAll("g.food-item")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "food-item")
    .attr("transform", (d, i) => `translate(0, ${i * circleSpacing})`);

  // Main circles
  circles.append("circle")
    .attr("class", "main-circle")
    .attr("r", d => circleDiameterScale(d.emission) / 2)
    .attr("fill", d => colorScale(d.emission))
    .on("mouseover", showSubBubbles)
    .on("mouseout", hideSubBubbles);

  // Labels
  circles.append("text")
    .attr("class", "food-label")
    .attr("text-anchor", "middle")
    .attr("dy", d => circleDiameterScale(d.emission) / 2 + 20)
    .style("font-size", "14px")
    .text(d => d.name);

  // Function to show sub-bubbles
  function showSubBubbles(event, d) {
    const mainCircle = d3.select(this);
    const parentG = d3.select(this.parentNode);
    const mainRadius = circleDiameterScale(d.emission) / 2;


      // Fade out the label
      parentG.select(".food-label")
      .transition()
      .duration(300)
      .style("opacity", 0.3);

    // Create sub-bubbles
    const subBubbles = emissionCategories.map((category, i) => {
      const value = d.categories[category];
      const angle = (i * (2 * Math.PI)) / emissionCategories.length;
      const radius = mainRadius + 40; // Distance from main circle center
      return {
        category: category,
        value: value,
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        color: categoryColors[i]
      };
    });

    // Add sub-bubbles
    parentG.selectAll(".sub-bubble")
      .data(subBubbles)
      .enter()
      .append("circle")
      .attr("class", "sub-bubble")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => subBubbleScale(d.value))
      .attr("fill", d => d.color)
      .attr("opacity", 0)
      .transition()
      .duration(300)
      .attr("opacity", 0.8);
  }

  // Function to hide sub-bubbles
  function hideSubBubbles() {
    const parentG = d3.select(this.parentNode);

        // Restore label opacity
        parentG.select(".food-label")
        .transition()
        .duration(300)
        .style("opacity", 1);
    parentG.selectAll(".sub-bubble")
      .transition()
      .duration(300)
      .attr("opacity", 0)
      .remove();
  }

  // Add legend after the SVG creation
  const legend = d3.select("#container")
    .append("div")
    .attr("class", "legend");

  // Add legend items
  emissionCategories.forEach((category, i) => {
    legend.append("div")
      .attr("class", "legend-item")
      .html(`
        <div class="legend-color" style="background: ${categoryColors[i]}"></div>
        <span>${category.replace('food_emissions_', '').replace(/_/g, ' ').toLowerCase()}</span>
      `);
  });
}

// Call fetchData when window loads
fetchData();

// Update visualization when window is resized
window.addEventListener('resize', () => {
  fetchData();
});