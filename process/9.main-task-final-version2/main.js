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
  try {
    const url = `./phone_usage_food_emissions.json`;
    let response = await fetch(url);

    if (response.ok) {
      let json = await response.json();
      
      const form = document.querySelector(".form");
      const selectedTime = form.querySelector('input[name="options"]:checked').value;
      console.log("Selected time period:", selectedTime);
      
      // Get selected apps and order them to match JSON format
      const selectedApps = Array.from(form.querySelectorAll('input[name="apps"]:checked'))
        .map(checkbox => checkbox.value);
      
      // Define the correct order as it appears in the JSON
      const appOrder = ["TikTok", "Instagram", "Netflix", "YouTube", "Gaming"];
      
      // Sort the selected apps according to the JSON order
      const orderedApps = selectedApps.sort((a, b) => {
        return appOrder.indexOf(a) - appOrder.indexOf(b);
      });
      
      console.log("Selected apps:", orderedApps);
      console.log("Number of selected apps:", orderedApps.length);
      
      if (orderedApps.length === 0) {
        alert("Please select at least one app!");
        return;
      }

      const appKey = orderedApps.join(", ");
      console.log("Looking for combination key:", appKey);
      
      const timeData = json[selectedTime];
      console.log("Available combinations:", Object.keys(timeData));
      
      // Check if the exact key exists in the data
      const keyExists = appKey in timeData;
      console.log("Key exists in data:", keyExists);
      console.log("Looking up:", {
        timeKey: selectedTime,
        appKey: appKey,
        availableTimeKeys: Object.keys(json),
        availableAppKeys: timeData ? Object.keys(timeData) : []
      });
      
      if (!timeData || !timeData[appKey]) {
        console.error("Data lookup failed:", {
          timeSelected: selectedTime,
          appsSelected: orderedApps,
          combinationKey: appKey,
          keyFoundInData: keyExists,
          availableKeys: timeData ? Object.keys(timeData) : []
        });
        alert("No data available for this combination!");
        return;
      }

      console.log("Found data for combination:", timeData[appKey]);

      // Update foodMap to exactly match JSON keys
      const foodMap = {
        "Tomato": "tomato",
        "Banana": "banana",
        "Ice Cream": "ice-cream",
        "Cheeseburger": "burger",
        "Avocado": "avocado"
      };

      const foodData = timeData[appKey]["Food Equivalents"];
      console.log("Food equivalents data:", foodData);

      // Transform the data for visualization
      const transformedData = {
        name: "root",
        children: Object.entries(foodData)
          .map(([name, value]) => {
            const mappedName = foodMap[name];
            console.log(`Mapping ${name} to ${mappedName}`);
            return {
              name: mappedName,
              value: Math.round(value)
            };
          })
          .filter(item => {
            const keep = item.name === currentFood;
            console.log(`Filtering ${item.name} (current: ${currentFood}): ${keep}`);
            return keep;
          })
      };

      console.log("Final transformed data:", transformedData);
      drawChart(transformedData);
      return Promise.resolve();
    } else {
      alert("HTTP-Error: " + response.status);
      return Promise.reject();
    }
  } catch (error) {
    console.error("Error in fetchData:", error);
    alert("Error fetching data. Please check the console for details.");
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
  const timeSelector = document.querySelector(".time-selector");
  const appsSelection = document.querySelector(".apps-selection");

  calculateBtn.addEventListener("click", () => {
    const selectedTime = form.querySelector('input[name="options"]:checked');
    const selectedApps = form.querySelectorAll('input[name="apps"]:checked');
    
    if (!selectedTime) {
      alert("Please select a time period!");
      return;
    }
    
    if (selectedApps.length === 0) {
      alert("Please select at least one app!");
      return;
    }

    isInitialized = true;
    foodFilters.classList.add('visible');
    
    // Set minimum height for container
    const container = document.querySelector("#container");
    container.style.minHeight = "3000px";
    
    // First fetch and render the data
    fetchData("food-data.json")
      .then(() => {
        // After the data is loaded and rendered, scroll down
        setTimeout(() => {
          window.scrollTo({
            top: 620,
            behavior: 'smooth'
          });
        }, 500); // Increased delay to 500ms
      })
      .catch(error => {
        console.error("Error during data fetch or scroll:", error);
      });
  });

  // Radio buttons trigger the animation
  form.addEventListener("change", (event) => {
    if (event.target.name === "options") {
      isInitialized = false;
      clearChart();
      foodFilters.classList.remove('visible');
      
      // Add animation classes
      timeSelector.classList.add('moved');
      appsSelection.classList.add('visible');
    }
  });

  // Add click handlers for food buttons
  foodButtons.forEach(button => {
    button.addEventListener("click", (event) => {
      if (!isInitialized) return;

      foodButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      
      currentFood = button.dataset.food;
      fetchData("food-data.json");
    });
  });
}

function drawChart(data) {
  console.log("Starting drawChart with data:", data);
  
  // Flatten the data into an array of food items
  let foodItems = data.children.flatMap((item) =>
    Array(item.value).fill(item.name)
  );
  
  console.log("Flattened food items:", foodItems);

  if (foodItems.length === 0) {
    console.log("No food items to display!");
    return;
  }

  const iconSize = 75;
  const iconSpacing = 30;
  const columns = 9;
  const rows = Math.ceil(foodItems.length / columns);
  
  const totalWidth = columns * (iconSize + iconSpacing) - iconSpacing;
  const totalHeight = rows * (iconSize + iconSpacing) - iconSpacing;

  // Set width and make height dynamic based on content
  const width = 1200;
  const height = Math.max(600, totalHeight + 40);

  // Create the SVG container if it doesn't exist
  if (!svg) {
    svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);
  }

  // Clear any existing content
  svg.selectAll("*").remove();

  // Create a group for all icons, positioned at the top
  const mainGroup = svg.append("g")
    .attr("transform", `translate(
      ${(width - totalWidth) / 2},
      20)`);

  // Create a group for each food item
  const foodGroups = mainGroup.selectAll("g.food-item")
    .data(foodItems)
    .enter()
    .append("g")
    .attr("class", "food-item")
    .attr("transform", (d, i) => {
      const x = (i % columns) * (iconSize + iconSpacing);
      const y = Math.floor(i / columns) * (iconSize + iconSpacing);
      console.log(`Positioning food item ${d} at (${x}, ${y})`);
      return `translate(${x}, ${y})`;
    });

  // Load and add the SVG content for each food item
  foodGroups.each(function(d) {
    const group = d3.select(this);
    const svgPath = `food/${d}.svg`;
    
    console.log(`Attempting to load SVG: ${svgPath}`);
    
    d3.xml(svgPath)
      .then(data => {
        console.log(`Successfully loaded SVG: ${svgPath}`);
        const svgNode = data.documentElement;
        
        // Set explicit width and height on the SVG element
        svgNode.setAttribute('width', iconSize);
        svgNode.setAttribute('height', iconSize);
        
        group.node().appendChild(svgNode);
      })
      .catch(error => {
        console.error(`Failed to load SVG ${svgPath}:`, error);
      });
  });

  // Append the SVG to the container
  const container = d3.select("#container");
  container.html("").append(() => svg.node());
  console.log("Chart appended to container");
}

// Clear the chart when the page loads
clearChart();

// make the document listen for changes on the radiobutton
addEventListeners();
