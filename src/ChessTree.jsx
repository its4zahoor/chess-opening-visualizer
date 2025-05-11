import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import chessOpenings from './chessOpenings.json';

const ChessTree = () => {
  const svgRef = useRef();

  useEffect(() => {
    const width = 1200;
    const height = 800;
    const margin = { top: 20, right: 120, bottom: 30, left: 120 };

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .call(
        d3.zoom().on('zoom', (event) => {
          g.attr('transform', event.transform);
        })
      );

    svg.selectAll('*').remove(); // Clear previous content

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const convertToHierarchy = (name, data, depth = 0, maxDepth = 4) => {
      if (depth >= maxDepth || typeof data !== 'object')
        return { name, children: [] };

      const children = Object.entries(data || {}).map(([key, value]) =>
        convertToHierarchy(key, value, depth + 1, maxDepth)
      );

      return { name, children };
    };

    const rawData = convertToHierarchy('Start', chessOpenings.Start);
    const root = d3.hierarchy(rawData);
    root.x0 = height / 2;
    root.y0 = 0;

    let i = 0;

    const treeLayout = d3.tree().nodeSize([30, 180]);

    // Collapse all children initially
    root.children?.forEach(collapse);

    function collapse(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    update(root);

    function update(source) {
      const duration = 300;
      const nodes = root.descendants();
      const links = root.links();

      treeLayout(root);

      // Normalize for fixed-depth
      nodes.forEach((d) => (d.y = d.depth * 180));

      // Nodes
      const node = g
        .selectAll('g.node')
        .data(nodes, (d) => d.id || (d.id = ++i));
      const nodeEnter = node
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', () => `translate(${source.y0},${source.x0})`)
        .on('click', (event, d) => {
          d.children = d.children ? null : d._children;
          update(d);
        });

      nodeEnter
        .append('circle')
        .attr('r', 1e-6)
        .attr('fill', (d) => (d._children ? '#555' : '#999'))
        .attr('stroke', '#333');

      nodeEnter
        .append('text')
        .attr('dy', 3)
        .attr('x', 10)
        .style('font-size', '12px')
        .text((d) => d.data.name)
        .style('fill-opacity', 1e-6);

      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate
        .transition()
        .duration(duration)
        .attr('transform', (d) => `translate(${d.y},${d.x})`);

      nodeUpdate
        .select('circle')
        .transition()
        .duration(duration)
        .attr('r', 6)
        .attr('fill', (d) => (d._children ? '#555' : '#999'));

      nodeUpdate
        .select('text')
        .transition()
        .duration(duration)
        .style('fill-opacity', 1);

      const nodeExit = node.exit().transition().duration(duration).remove();

      nodeExit.attr('transform', () => `translate(${source.y},${source.x})`);
      nodeExit.select('circle').attr('r', 1e-6);
      nodeExit.select('text').style('fill-opacity', 1e-6);

      // Links
      const link = g.selectAll('path.link').data(links, (d) => d.target.id);

      const linkEnter = link
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 2)
        .attr('d', () => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        });

      link.merge(linkEnter).transition().duration(duration).attr('d', diagonal);

      link
        .exit()
        .transition()
        .duration(duration)
        .attr('d', () => {
          const o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        })
        .remove();

      nodes.forEach((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    function diagonal(d) {
      return `M${d.source.y},${d.source.x}
              C${(d.source.y + d.target.y) / 2},${d.source.x}
               ${(d.source.y + d.target.y) / 2},${d.target.x}
               ${d.target.y},${d.target.x}`;
    }
  }, []);

  return <svg ref={svgRef}></svg>;
};

export default ChessTree;
