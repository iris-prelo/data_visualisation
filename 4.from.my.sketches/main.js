import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 400;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;
const circleSpacing = 300;

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
  const height = data.length * circleSpacing + 200;

  d3.select("#container").selectAll("svg").remove();

  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const circleDiameterScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.emission)])
    .range([10, 240]);

  const colorScale = d3.scaleSequential(d3.interpolateRgb("blue", "pink"))
    .domain([0, d3.max(data, d => d.emission)]);

  const circles = svg.selectAll("g")
    .data(data)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(${width / 2}, ${i * circleSpacing + 150})`);

  circles.append("circle")
    .attr("r", d => circleDiameterScale(d.emission) / 2)
    .attr("fill", d => colorScale(d.emission))
    .append("title")
    .text(d => `Food: ${d.name}\nTotal Emissions: ${d.emission.toFixed(2)} kg CO2eq/kg`);

  circles.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", d => circleDiameterScale(d.emission) / 2 + 20)
    .text(d => d.name);
}

fetchData();