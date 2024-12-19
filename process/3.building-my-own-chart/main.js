import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

console.log("Displaying simple bar chart");

// Adjust dimensions for better visibility
const width = 400;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;
const circleSpacing = 300; // Adjust this value to increase/decrease spacing

async function fetchData() {
  const url = "./data.json"; // data from https://opendata.swiss/en/dataset/treibhausgasemissionen-im-kanton-zurich
  let response = await fetch(url);

  if (response.ok) {
    // if HTTP-status is 200-299
    // get the response body (the method explained below)
    let json = await response.json();
    console.log("Finally received the response:");
    console.log("Response: ", json);
    const filteredData = filterData(json);
    drawCircles(filteredData);
  } else {
    alert("HTTP-Error: " + response.status);
  }
}

function filterData(data) {
  // Filter for unique years and sum emissions per year
  const yearlyEmissions = d3.rollup(
    data,
    v => d3.sum(v, d => d.emission), // sum all emissions for each year
    d => d.jahr // group by year
  );
  
  // Convert Map to array of objects
  return Array.from(yearlyEmissions, ([jahr, emission]) => ({
    jahr,
    emission
  })).sort((a, b) => a.jahr - b.jahr); // Sort by year
}

function drawCircles(data) {
  const height = data.length * circleSpacing + 200; // Dynamic height based on data length

  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Adjust scales for better visibility
  const circleDiameterScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.emission)])
    .range([10, 240]); // Adjust range for desired diameter differences

  const colorScale = d3.scaleSequential(d3.interpolateRgb("blue", "pink"))
    .domain([0, d3.max(data, d => d.emission)]);

  // Create a group for each circle and its label
  const circles = svg.selectAll("g")
    .data(data)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(${width / 2}, ${i * circleSpacing + 150})`); // Increased spacing

  // Add circles
  circles.append("circle")
    .attr("r", d => circleDiameterScale(d.emission) / 2) // Calculate radius from diameter
    .attr("fill", d => colorScale(d.emission))
    .append("title")
    .text(d => `Year: ${d.jahr}\nEmission: ${Math.round(d.emission).toLocaleString()} t/a`);

  // Add year labels
  circles.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", d => circleDiameterScale(d.emission) / 2 + 20) // Adjust label position based on radius
    .text(d => d.jahr);
}

// Call fetchData to load and visualize the data
fetchData();