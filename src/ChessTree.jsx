import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import openings from './chessOpenings.json';

const width = 1200;
const height = 800;

function convertToHierarchy(name, obj) {
  const node = { name, children: [] };
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const child = obj[key];
      const move = key;
      const childNode = convertToHierarchy(move, child);
      node.children.push(childNode);
    }
  }
  return node;
}

const ChessTree = () => {
  const svgRef = useRef();

  useEffect(() => {
    const rawData = convertToHierarchy('Start', openings.Start);
    const root = d3.hierarchy(rawData);
    root.x0 = height / 2;
    root.y0 = 0;

    let i = 0;
    const tree = d3.tree().size([height, width - 200]);

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#111');

    const g = svg.append('g').attr('transform', 'translate(80,0)');

    // Enable zoom and pan
    const zoom = d3.zoom().on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom);

    function update(source) {
      const treeData = tree(root);
      const nodes = treeData.descendants();
      const links = treeData.descendants().slice(1);

      nodes.forEach((d) => {
        d.y = d.depth * 120;
      });

      const node = g
        .selectAll('g.node')
        .data(nodes, (d) => d.id || (d.id = ++i));

      const nodeEnter = node
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d) => `translate(${source.y0},${source.x0})`)
        .on('click', (event, d) => {
          d.children = d.children ? null : d._children;
          update(d);
        });

      nodeEnter
        .append('circle')
        .attr('r', 8)
        .style('fill', (d) => (d._children ? '#0af' : '#4f4f4f'))
        .style('stroke', '#fff')
        .style('stroke-width', '1.5px');

      nodeEnter
        .append('text')
        .attr('dy', '0.35em')
        .attr('x', (d) => (d.children || d._children ? -12 : 12))
        .attr('text-anchor', (d) =>
          d.children || d._children ? 'end' : 'start'
        )
        .text((d) => d.data.name)
        .style('fill', '#fff')
        .style('font-size', '14px')
        .style('font-family', 'monospace');

      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate
        .transition()
        .duration(500)
        .attr('transform', (d) => `translate(${d.y},${d.x})`);

      const nodeExit = node
        .exit()
        .transition()
        .duration(500)
        .attr('transform', (d) => `translate(${source.y},${source.x})`)
        .remove();

      nodeExit.select('circle').attr('r', 0);
      nodeExit.select('text').style('fill-opacity', 0);

      const link = g.selectAll('path.link').data(links, (d) => d.id);

      const linkEnter = link
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('d', (d) => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal(o, o);
        })
        .attr('fill', 'none')
        .attr('stroke', '#888')
        .attr('stroke-width', 2);

      const linkUpdate = linkEnter.merge(link);
      linkUpdate
        .transition()
        .duration(500)
        .attr('d', (d) => diagonal(d, d.parent));

      const linkExit = link
        .exit()
        .transition()
        .duration(500)
        .attr('d', (d) => {
          const o = { x: source.x, y: source.y };
          return diagonal(o, o);
        })
        .remove();

      nodes.forEach((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
        d._children = d.children;
      });
    }

    function diagonal(s, d) {
      return `M${s.y},${s.x}C${(s.y + d.y) / 2},${s.x} ${(s.y + d.y) / 2},${
        d.x
      } ${d.y},${d.x}`;
    }

    update(root);
  }, []);

  return <svg ref={svgRef}></svg>;
};

export default ChessTree;
