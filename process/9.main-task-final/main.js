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
  const foodFilters = document.querySelector(".food-filters");

  // Radio buttons clear the screen and reset initialization
  form.addEventListener("change", (event) => {
    if (event.target.name === "options") {
      console.log(`Selected option: ${event.target.value}`);
      isInitialized = false;
      clearChart();
      foodFilters.classList.remove('visible'); // Hide food buttons when changing radio
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
    foodFilters.classList.add('visible'); // Show food buttons
    fetchData("food-data.json").then(() => {
      // Wait for next frame to ensure DOM is updated
      requestAnimationFrame(() => {
        // Get the container element
        const container = document.getElementById('container');
        // Scroll container into view
        container.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    });
  });
}

function drawChart(data) {
  // Flatten the data into an array of food items
  let foodItems = data.children.flatMap((item) =>
    Array(item.value).fill(item.name)
  );

  // Filter food items for the selected food
  foodItems = foodItems.filter(item => item === currentFood);

  const iconSize = 75;
  const iconSpacing = 30;
  const columns = 8;
  const rows = Math.ceil(foodItems.length / columns);
  
  const totalWidth = columns * (iconSize + iconSpacing) - iconSpacing;
  const totalHeight = rows * (iconSize + iconSpacing) - iconSpacing;

  // Set fixed dimensions for the SVG
  const width = 1000;
  const height = 600;

  // Create the SVG container if it doesn't exist
  if (!svg) {
    svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);
  }

  // Clear any existing content
  svg.selectAll("*").remove();

  // Create a centered group for all icons
  const mainGroup = svg.append("g")
    .attr("transform", `translate(
      ${(width - totalWidth) / 2},
      ${(height - totalHeight) / 2}
    )`);

  // Create a group for each food item
  const foodGroups = mainGroup.selectAll("g.food-item")
    .data(foodItems)
    .enter()
    .append("g")
    .attr("class", "food-item")
    .attr("transform", (d, i) => 
      `translate(
        ${(i % columns) * (iconSize + iconSpacing)},
        ${Math.floor(i / columns) * (iconSize + iconSpacing)}
      )`
    );

  // Load and add the SVG content for each food item
  foodGroups.each(function(d) {
    const group = d3.select(this);
    const filename = d === 'ice_cream' ? 'ice-cream' : d;
    d3.xml(`food/${filename}.svg`).then(data => {
      const svgNode = data.documentElement;
      const viewBox = svgNode.getAttribute("viewBox").split(" ");
      const aspectRatio = viewBox[2] / viewBox[3];
      
      let width = iconSize;
      let height = iconSize;
      if (aspectRatio > 1) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }
      
      const xOffset = (iconSize - width) / 2;
      const yOffset = (iconSize - height) / 2;
      
      group.node().appendChild(svgNode);
      group.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("x", xOffset)
        .attr("y", yOffset);
    });
  });

  // Append the SVG to the container
  d3.select("#container").html("").append(() => svg.node());
}

// Clear the chart when the page loads
clearChart();

// make the document listen for changes on the radiobutton
addEventListeners();

