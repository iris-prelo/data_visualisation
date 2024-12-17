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
    const url = `./${dataSet}`;
    let response = await fetch(url);

    if (response.ok) {
      let json = await response.json();
      console.log("Fetched raw JSON:", json);
      
      // Get selected time period
      const form = document.querySelector(".form");
      const selectedTime = form.querySelector('input[name="options"]:checked').value;
      console.log("Selected time period:", selectedTime);
      
      // Get selected apps
      const selectedApps = Array.from(form.querySelectorAll('input[name="apps"]:checked'))
        .map(checkbox => checkbox.value);
      console.log("Selected apps:", selectedApps);
      
      if (selectedApps.length === 0) {
        alert("Please select at least one app!");
        return;
      }

      // Get the key for selected apps
      const appKey = selectedApps.sort().join(", ");
      console.log("Looking for app combination:", appKey);
      
      // Get the data for selected time period and apps
      const timeData = json[selectedTime];
      if (!timeData || !timeData[appKey]) {
        console.error("No data found for combination:", { selectedTime, appKey });
        alert("No data available for this combination!");
        return;
      }

      console.log("Found data for combination:", timeData[appKey]);

      // Map food names to file names
      const foodMap = {
        "Tomato": "tomato",
        "Banana": "banana",
        "Ice Cream": "ice_cream",
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
    } else {
      alert("HTTP-Error: " + response.status);
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

  // Radio buttons clear the screen and reset initialization
  form.addEventListener("change", (event) => {
    if (event.target.name === "options") {
      isInitialized = false;
      clearChart();
      foodFilters.classList.remove('visible');
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

  // Add click handler for calculate button
  calculateBtn.addEventListener("click", () => {
    const selectedApps = form.querySelectorAll('input[name="apps"]:checked');
    if (selectedApps.length === 0) {
      alert("Please select at least one app!");
      return;
    }

    isInitialized = true;
    foodFilters.classList.add('visible');
    fetchData("food-data.json").then(() => {
      // Wait for next frame to ensure DOM is updated
      requestAnimationFrame(() => {
        const container = document.getElementById('container');
        container.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      });
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
    .attr("transform", (d, i) => {
      const x = (i % columns) * (iconSize + iconSpacing);
      const y = Math.floor(i / columns) * (iconSize + iconSpacing);
      console.log(`Positioning food item ${d} at (${x}, ${y})`);
      return `translate(${x}, ${y})`;
    });

  // Load and add the SVG content for each food item
  foodGroups.each(function(d) {
    const group = d3.select(this);
    const filename = d === 'ice_cream' ? 'ice-cream' : d;
    const svgPath = `food/${filename}.svg`;
    
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

