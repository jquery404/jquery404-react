import React, { Component } from 'react';
import { select, geoMercator, geoPath, zoom, json } from 'd3';


class WorldMap extends Component {
    componentDidMount() {
        select(this.refs.map).selectAll('*').remove();
        this.drawMap();
        window.addEventListener('resize', this.handleResize);
    }
    
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }
    
    handleResize = () => {
        select(this.refs.map).selectAll('*').remove();
        this.drawMap();
    }
    
    drawMap() {
        const containerWidth = this.refs.mapContainer.offsetWidth;
        const width = containerWidth;
        const height = 0.6 * containerWidth;
        const geomap = {
          countries: ["Australia", "Malaysia", "New Zealand", "Turkey", "Serbia", "Singapore", "Sweden", "Bangladesh", "South Korea", "Japan", "USA"],
          cities : [
            { name: "Sydney", country: "Australia", coords: [151.2093, -33.8688] },
            { name: "New South Wales", country: "Australia", coords: [147.1547, -31.2532] },
            { name: "Istanbul", country: "Turkey", coords: [28.9784, 41.0082] },
            { name: "Belgrade", country: "Serbia", coords: [20.4489, 44.7866] },
            { name: "San Francisco", country: "USA", coords: [-122.4194, 37.7749] },
            { name: "Los Angeles", country: "USA", coords: [-118.2437, 34.0522] },
            { name: "Orlando", country: "USA", coords: [-81.3792, 28.5383] },
            { name: "Daegu", country: "South Korea", coords: [128.6018, 35.8722] },
            { name: "Seoul", country: "South Korea", coords: [126.9780, 37.5665] },
            { name: "Tokyo", country: "Japan", coords: [139.6917, 35.6895] },
            { name: "Kuala Lumpur", country: "Malaysia", coords: [101.6869, 3.1390] },
            { name: "Malacca", country: "Malaysia", coords: [102.2525, 2.1896] },
            { name: "Penang", country: "Malaysia", coords: [100.2400, 5.4141] },
            { name: "Wellington", country: "New Zealand", coords: [174.7762, -41.2865] },
            { name: "Christchurch", country: "New Zealand", coords: [172.6306, -43.5321] },
            { name: "Auckland", country: "New Zealand", coords: [174.7633, -36.8485] },
            { name: "Dhaka", country: "Bangladesh", coords: [90.4125, 23.8103] },
            { name: "Stockholm", country: "Sweden", coords: [18.0686, 59.3293] },
            { name: "Singapore", country: "Singapore", coords: [103.8198, 1.3521] }
          ]
        };
      
        const svg = select(this.refs.map)
                      .attr("width", width)
                      .attr("height", height);
      
        const projection = geoMercator()
                             .scale(width / 6.5)
                             .translate([width / 2, height / 2]);
      
        const path = geoPath().projection(projection);
        const tooltip = select(this.refs.tooltip).style("opacity", 0);
      
        const g = svg.append("g");
      
        json("https://raw.githubusercontent.com/jquery404/jquery404.github.io/master/blog/world.geojson").then(data => {
          g.selectAll("path")
           .data(data.features)
           .enter()
           .append("path")
           .attr("d", path)
           .attr("fill", function(d) {
             if (geomap.countries.includes(d.properties.name)) {
               return "#F4C444";
             } else {
               return "#FFFFFF";
             }
           })
           .attr("stroke", "#83868A")
           .attr("stroke-width", 1);
      
          g.selectAll("circle")
           .data(geomap.cities)
           .enter()
           .append("circle")
           .attr("cx", d => projection(d.coords)[0])
           .attr("cy", d => projection(d.coords)[1])
           .attr("r", 4)
           .attr("fill", "#E95453")
           .attr("stroke", "#FFFFFF")
           .attr("stroke-width", 2)
           .on("mouseover", function(event, d) {
              select(this)
                .transition()
                .duration(200)
                .attr("r", 6);
             tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
             tooltip.html(`${d.name}, ${d.country}`);
           })
           .on("mouseout", function() {
              select(this)
              .transition()
              .duration(200)
              .attr("r", 4);
             tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
           });
        });
      
        const zoomBehavior = zoom()
                             .scaleExtent([1, 8])
                             .on("zoom", (event) => {
                               g.attr("transform", event.transform);
                             });
      
        svg.call(zoomBehavior);
    } 

  render() {

    return (
        <div className="row">
          <div className="col-sm-12">
            <h1 className="mt-5">Adventure Is Out There</h1>
            <p>Explore the cities and countries I've been by hovering over the red markers. 
                    Each marker represents a unique adventure and unforgettable memories.</p>
          </div>
          
          <div className="col-sm-10">
              <div ref="mapContainer" className="map-container">
                  <svg ref="map" className="travelMap"></svg>
                  <div ref="tooltip" className="mapTooltip"></div>
              </div>
          </div>
      </div>
    );
  }
}

export default WorldMap;
