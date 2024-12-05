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

function addEventListeners() {
  const form = document.querySelector(".form");

  form.addEventListener("change", (event) => {
    if (event.target.name === "options") {
      console.log(`Selected option: ${event.target.value}`);
      fetchData("food-data.json");
    }
  });
}

function drawChart(data) {
  // Update food categories
  const categories = ["banana", "burger", "avocado", "tomato", "ice_cream"];
  
  // Specify the color scale with new colors for foods
  const color = d3.scaleOrdinal(
    categories,
    [
      "#FFE135", // banana - yellow
      "#8B4513", // burger - brown
      "#568203", // avocado - green
      "#FF6347", // tomato - red
      "#FFDAB9"  // ice cream - pale pink
    ]
  );

  console.log("d3.schemeTableau10: ", d3.schemeTableau10);

  // Compute the layout.
  const root = d3
    .treemap()
    .tile(d3.treemapSquarify) // e.g., d3.treemapSquarify
    .size([width, height])
    .padding(0)
    .round(false)(
    d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value)
  );

  // Create the SVG container.
  if (!svg) {
    svg = d3
      .create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height);
  }

  // Add a cell for each leaf of the hierarchy.
  const leaf = svg.selectAll("g").data(root.leaves(), (d) => d.data.name); // make sure to use the name as key, otherwise the update will not work

  // define enter (instead of using .join, which would also handle update and exit)
  const leafEnter = leaf
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  // Append a color rectangle.
  leafEnter
    .append("rect")
    .attr("id", (d) => (d.leafUid = uid("leaf")).id)
    .attr("fill", (d) => {
      return color(d.data.name);
    })
    .attr("stroke-width", 1)
    // depending on the level of the hierarchy, change the stroke color
    .attr("stroke", (d) => {
      if (d.depth >= 3) {
        return "#5F8E79";
      } else {
        return "#5A3D3D";
      }
    })
    .attr("fill-opacity", 0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    // and also add event listeners for mouseover, mousemove and mouseout
    // must be added to the rect otherwise d will not be refering to the data
    .on("mouseover", (event, d) => {
      console.log("d: ", d);
      tooltip.style("visibility", "visible");
    })
    .on("mousemove", (event, d) => {
      tooltip
        .style("top", event.pageY - 10 + "px")
        .style("left", event.pageX + 10 + "px")
        .html(`${d.data.name}:<br>${d.data.area}`);
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
    })
    .transition()
    .duration(750)
    .attr("fill-opacity", 0.6)
    .attr("stroke-opacity", 0.6);

  leafEnter
    .append("text")
    .attr("clip-path", (d) => d.clipUid)
    .selectAll("tspan")
    .data((d) => {
      return d.data.name
        .split(/(?=[A-Z][a-z])|\s+/g)
        .concat(`${d.data.value.toFixed(2)}%`);
    })
    .join("tspan")
    .attr("x", 3)
    .attr(
      "y",
      (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 1.1}em`
    )
    .attr("fill-opacity", (d, i, nodes) =>
      i === nodes.length - 1 ? 0.7 : null
    )
    .text((d) => d)
    .transition()
    .duration(750);

  // Handle update selection (existing data).
  leaf
    .transition()
    .duration(750) // Smooth transition for updates.
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  // don't chain methods with transition above to wait until the first transition is finished
  leaf
    .select("rect")
    .transition()
    .duration(750)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0);

  leaf
    .select("text")
    .selectAll("tspan")
    .data((d) => {
      return d.data.name
        .split(/(?=[A-Z][a-z])|\s+/g)
        .concat(`${d.data.value.toFixed(2)}%`);
    })
    .text((d) => d);

  // Handle exit selection (remove data).
  leaf.exit().remove();

  // append tooltip for mouseover
  let tooltip = d3.select("body").append("div").attr("class", "tooltip");

  container.append(svg.node());
}

// make the document listen for changes on the radiobutton
addEventListeners();
fetchData("data.json");
