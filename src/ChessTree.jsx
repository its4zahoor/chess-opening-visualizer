import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import treeData from './openings.json';

const ChessTree = () => {
  const svgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Helper function to determine if a move is white's or black's
  const isWhiteMove = (move) => {
    if (move.includes('...')) return false;
    if (!move.match(/^\d+\./)) return null;
    return true;
  };

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleNode = (node) => {
    setCollapsedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(node.data.move)) {
        newSet.delete(node.data.move);
      } else {
        newSet.add(node.data.move);
      }
      return newSet;
    });
  };

  useEffect(() => {
    // Move getNodeColors inside useEffect
    const getNodeColors = (move) => {
      const moveType = isWhiteMove(move);
      if (moveType === null) {
        return {
          circle: '#1976d2', // Blue for opening names
          text: '#fff',
          border: '#222',
          hover: '#43a047',
        };
      }
      if (moveType) {
        return {
          circle: '#fff', // White for white's moves
          text: '#222',
          border: '#222',
          hover: '#43a047',
        };
      } else {
        return {
          circle: '#222', // Black for black's moves
          text: '#fff',
          border: '#222',
          hover: '#43a047',
        };
      }
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Increase spacing for readability
    const margin = { top: 80, right: 80, bottom: 80, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Increase node spacing
    const treeLayout = d3.tree().nodeSize([70, 220]).size([height, width]);
    const root = d3.hierarchy(treeData);
    const collapse = (d) => {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    };
    root.descendants().forEach((d) => {
      if (collapsedNodes.has(d.data.move)) {
        collapse(d);
      }
    });
    root.x0 = height / 2;
    root.y0 = 0;
    treeLayout(root);

    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#222')
      .attr('stroke-width', 4)
      .attr(
        'd',
        d3
          .linkHorizontal()
          .x((d) => d.y)
          .y((d) => d.x)
      );

    const node = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        const path = [];
        let current = d;
        while (current.parent) {
          path.push(current);
          current = current.parent;
        }
        path.push(current);
        node.selectAll('circle').each(function (d) {
          const colors = getNodeColors(d.data.move);
          d3.select(this)
            .attr('fill', colors.circle)
            .attr('stroke', colors.border)
            .attr('r', 13);
        });
        path.forEach((p) => {
          d3.select(this.parentNode)
            .selectAll('.node')
            .filter((n) => n === p)
            .select('circle')
            .attr('fill', '#43a047')
            .attr('stroke', '#222')
            .attr('r', 18);
        });
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background-color', '#fff')
          .style('color', '#222')
          .style('padding', '14px')
          .style('border-radius', '10px')
          .style('box-shadow', '0 2px 12px rgba(0,0,0,0.18)')
          .style('pointer-events', 'none')
          .style('z-index', '1000');
        const openingName = getOpeningName(d);
        tooltip
          .html(
            `<strong>${d.data.move}</strong>${
              openingName !== d.data.move ? `<br/><em>${openingName}</em>` : ''
            }`
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 10 + 'px');
      })
      .on('mouseout', function () {
        node.selectAll('circle').each(function (d) {
          const colors = getNodeColors(d.data.move);
          d3.select(this)
            .attr('fill', colors.circle)
            .attr('stroke', colors.border)
            .attr('r', 13);
        });
        d3.selectAll('.tooltip').remove();
      })
      .on('click', function (event, d) {
        if (d.children || d._children) {
          toggleNode(d);
        }
        setSelectedNode(d);
      });

    node
      .append('circle')
      .attr('r', 13)
      .attr('fill', (d) => getNodeColors(d.data.move).circle)
      .attr('stroke', (d) => getNodeColors(d.data.move).border)
      .attr('stroke-width', 3);

    node
      .append('text')
      .attr('x', 0)
      .attr('dy', 28)
      .attr('text-anchor', 'middle')
      .style('font-size', '22px')
      .style('font-weight', 700)
      .style('paint-order', 'stroke')
      .style('stroke', (d) =>
        getNodeColors(d.data.move).text === '#fff' ? '#111' : '#fff'
      )
      .style('stroke-width', 3)
      .style('stroke-linejoin', 'round')
      .style('fill', (d) => getNodeColors(d.data.move).text)
      .html(function (d) {
        const icon = d._children ? '+' : d.children ? '-' : '';
        return icon
          ? `<tspan class='expand-collapse' fill='#43a047' font-size='28' cursor='pointer'>${icon}</tspan> <tspan>${getMoveDisplay(
              d.data.move
            )}</tspan>`
          : `<tspan>${getMoveDisplay(d.data.move)}</tspan>`;
      });
  }, [selectedNode, collapsedNodes, dimensions]);

  // Helper function to get move display text
  const getMoveDisplay = (move) => {
    if (!move.match(/^\d+\./)) return '';
    return move.replace(/^\d+\.\.\.?/, '');
  };

  // Helper function to get opening name from node
  const getOpeningName = (node) => {
    let current = node;
    while (current) {
      if (!current.data.move.match(/^\d+\./)) {
        return current.data.move;
      }
      current = current.parent;
    }
    return '';
  };

  return (
    <div className='min-h-screen w-screen overflow-x-hidden flex flex-col items-center p-0 m-0 bg-gradient-to-br from-slate-100 to-slate-400'>
      {selectedNode && (
        <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-white m-0 rounded-lg w-full max-w-3xl text-gray-900 shadow-md flex flex-col items-center flex-wrap gap-4'>
          <span className='font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis'>
            Selected Opening: {getOpeningName(selectedNode)}
          </span>
          <span className='text-sm text-gray-700 break-words'>
            Path:{' '}
            {selectedNode
              .ancestors()
              .map((d) => d.data.move)
              .reverse()
              .join(' → ')}
          </span>
        </div>
      )}
      <div className='w-screen h-full flex justify-center items-center bg-white bg-opacity-10 rounded-none shadow-none relative'>
        <div className='absolute inset-0 z-0 bg-gradient-to-br from-slate-100 to-slate-400' />
        <svg
          ref={svgRef}
          className='border-none w-screen h-full block relative z-10'
        />
      </div>
    </div>
  );
};

export default ChessTree;
