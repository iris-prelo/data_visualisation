import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

console.log("Displaying simple bar chart");

// Declare the chart dimensions and margins.
const width = 800;
const height = 800;

let svg;

// get all the names for the items without children in a flat array
function getNames(node) {
  let names = [];
  if (node.children) {
    node.children.forEach((child) => {
      names = names.concat(getNames(child));
    });
  } else {
    if (node.name) {
      names.push(node.name);
    }
  }
  return names;
}

async function fetchData(dataSet) {
  const url = `./${dataSet}`;
  let response = await fetch(url);

  if (response.ok) {
    let json = await response.json();
    console.log("Response: ", json);

    // Transform the data based on selected category
    const form = document.querySelector(".form");
    const selectedOption = form.querySelector('input[name="options"]:checked').value;
    
    // Map the radio values to the JSON keys
    const categoryMap = {
      'less3': 'less_than_3_hours',
      'less5': 'less_than_5_hours',
      'less7': 'less_than_7_hours',
      'more7': 'greater_than_7_hours'
    };

    // Transform the data into hierarchical format
    const transformedData = {
      name: "root",
      children: Object.entries(json.screen_time_data[categoryMap[selectedOption]]).map(([name, value]) => ({
        name: name,
        value: value
      }))
    };

    drawChart(transformedData);
  } else {
    alert("HTTP-Error: " + response.status);
  }
}

/* Add Id functionality. Copied from https://github.com/observablehq/stdlib/blob/main/src/dom/uid.js */
let count = 0;

export function uid(name) {
  return new Id("O-" + (name == null ? "" : name + "-") + ++count);
}

function Id(id) {
  this.id = id;
  this.href = new URL(`#${id}`, location) + "";
}

Id.prototype.toString = function () {
  return "url(" + this.href + ")";
};

// Update the initial currentFood value to 'banana' instead of 'all'
let currentFood = 'banana';

// Add a flag to track if initial calculation has been done
let isInitialized = false;

// Add this function to clear the visualization
function clearChart() {
  if (svg) {
    svg.selectAll("*").remove();
  }
  d3.select("#container").selectAll("svg").remove();
}

function addEventListeners() {
  const form = document.querySelector(".form");
  const foodButtons = document.querySelectorAll(".food-btn");
  const calculateBtn = document.querySelector("#calculate-btn");

  // Radio buttons clear the screen and reset initialization
  form.addEventListener("change", (event) => {
    if (event.target.name === "options") {
      console.log(`Selected option: ${event.target.value}`);
      isInitialized = false;
      clearChart();
    }
  });

  // Add click handlers for food buttons
  foodButtons.forEach(button => {
    button.addEventListener("click", (event) => {
      if (!isInitialized) {
        return;
      }

      foodButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      
      currentFood = button.dataset.food;
      fetchData("food-data.json");
    });
  });

  // Add click handler for calculate button
  calculateBtn.addEventListener("click", () => {
    isInitialized = true;
    fetchData("food-data.json");
  });
}

function drawChart(data) {
  // Flatten the data into an array of food items
  let foodItems = data.children.flatMap((item) =>
    Array(item.value).fill(item.name)
  );

  // Always filter food items for the selected food (removed the 'all' condition)
  foodItems = foodItems.filter(item => item === currentFood);

  // Specify the color scale with new colors for foods
  const color = d3.scaleOrdinal()
    .domain(["banana", "burger", "avocado", "tomato", "ice_cream"])
    .range([
      "#FFE135", // banana - yellow
      "#8B4513", // burger - brown
      "#568203", // avocado - green
      "#FF6347", // tomato - red
      "#FFDAB9"  // ice cream - pale pink
    ]);

  // Create the SVG container.
  if (!svg) {
    svg = d3
      .create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height);
  }

  // Clear any existing content
  svg.selectAll("*").remove();

  // Define the size of each square
  const squareSize = 20;
  const columns = Math.floor(width / squareSize);

  // Add a square for each food item
  svg.selectAll("rect")
    .data(foodItems)
    .enter()
    .append("rect")
    .attr("x", (d, i) => (i % columns) * squareSize)
    .attr("y", (d, i) => Math.floor(i / columns) * squareSize)
    .attr("width", squareSize)
    .attr("height", squareSize)
    .attr("fill", (d) => color(d))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1);

  // Append the SVG to the container
  d3.select("#container").append(() => svg.node());
}

// Clear the chart when the page loads
clearChart();

// make the document listen for changes on the radiobutton
addEventListeners();

