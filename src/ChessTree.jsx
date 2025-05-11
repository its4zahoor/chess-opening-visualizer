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
    // If the move contains "..." it's black's move
    if (move.includes('...')) {
      return false;
    }
    // If it's an opening name (doesn't contain a move number), it's neutral
    if (!move.match(/^\d+\./)) {
      return null;
    }
    // Otherwise it's white's move
    return true;
  };

  // Helper function to get node colors
  const getNodeColors = (move) => {
    const moveType = isWhiteMove(move);
    if (moveType === null) {
      return {
        circle: '#888888', // Neutral gray for opening names
        text: '#ffffff', // White text
        hover: '#4CAF50', // Green on hover
      };
    }
    if (moveType) {
      return {
        circle: '#e0e0e0', // Light gray for white's moves
        text: '#ffffff', // White text
        hover: '#4CAF50', // Green on hover
      };
    } else {
      return {
        circle: '#666666', // Dark gray for black's moves
        text: '#cccccc', // Light gray text
        hover: '#4CAF50', // Green on hover
      };
    }
  };

  // Helper function to get move display text
  const getMoveDisplay = (move) => {
    // If it's an opening name, return empty string
    if (!move.match(/^\d+\./)) {
      return '';
    }
    // Remove move number and dots for cleaner display
    return move.replace(/^\d+\.\.\.?/, '');
  };

  // Helper function to get opening name from node
  const getOpeningName = (node) => {
    // Look for the nearest parent that is an opening name
    let current = node;
    while (current) {
      if (!current.data.move.match(/^\d+\./)) {
        return current.data.move;
      }
      current = current.parent;
    }
    return '';
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
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 60, right: 120, bottom: 60, left: 120 };
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

    const treeLayout = d3.tree().size([height, width]);

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

    // Draw links with animation
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        // Color the link based on the target node's move
        return isWhiteMove(d.target.data.move) ? '#e0e0e0' : '#666666';
      })
      .attr('stroke-width', 2)
      .attr(
        'd',
        d3
          .linkHorizontal()
          .x((d) => d.y)
          .y((d) => d.x)
      );

    // Draw nodes
    const node = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`)
      .on('mouseover', function (event, d) {
        const path = [];
        let current = d;
        while (current.parent) {
          path.push(current);
          current = current.parent;
        }
        path.push(current);

        // Reset all nodes to their original colors
        node.selectAll('circle').each(function (d) {
          const colors = getNodeColors(d.data.move);
          d3.select(this).attr('fill', colors.circle).attr('r', 6);
        });

        // Highlight path nodes
        path.forEach((p) => {
          d3.select(this.parentNode)
            .selectAll('.node')
            .filter((n) => n === p)
            .select('circle')
            .attr('fill', '#4CAF50')
            .attr('r', 8);
        });

        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background-color', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('z-index', '1000');

        const openingName = getOpeningName(d);
        const moveType = isWhiteMove(d.data.move);
        let moveTypeText = '';
        if (moveType === true) moveTypeText = "White's move";
        else if (moveType === false) moveTypeText = "Black's move";

        tooltip
          .html(
            `
            <strong>${d.data.move}</strong>
            ${moveTypeText ? `<br/>${moveTypeText}` : ''}
            ${openingName ? `<br/><em>${openingName}</em>` : ''}
          `
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 10 + 'px');
      })
      .on('mouseout', function () {
        // Reset nodes to their original colors
        node.selectAll('circle').each(function (d) {
          const colors = getNodeColors(d.data.move);
          d3.select(this).attr('fill', colors.circle).attr('r', 6);
        });
        d3.selectAll('.tooltip').remove();
      })
      .on('click', function (event, d) {
        if (d.children || d._children) {
          toggleNode(d);
        }
        setSelectedNode(d);
      });

    // Add circles to nodes with appropriate colors
    node
      .append('circle')
      .attr('r', 6)
      .attr('fill', (d) => getNodeColors(d.data.move).circle);

    // Add expand/collapse indicators
    node
      .append('text')
      .attr('class', 'expand-collapse')
      .attr('x', (d) => (d.children || d._children ? -20 : 0))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .text((d) => {
        if (d._children) return '+';
        if (d.children) return '-';
        return '';
      })
      .style('fill', '#4CAF50')
      .style('font-size', '20px')
      .style('cursor', 'pointer');

    // Add move text with appropriate colors
    node
      .append('text')
      .attr('dy', 3)
      .attr('x', (d) => (d.children || d._children ? -10 : 10))
      .attr('text-anchor', (d) => (d.children || d._children ? 'end' : 'start'))
      .text((d) => getMoveDisplay(d.data.move))
      .style('fill', (d) => getNodeColors(d.data.move).text)
      .style('font-size', '14px');
  }, [selectedNode, collapsedNodes, dimensions]);

  return (
    <div
      style={{
        backgroundColor: '#111',
        minHeight: '100vh',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem',
      }}
    >
      <h1
        style={{
          padding: '1rem',
          fontSize: '2rem',
          marginBottom: '1rem',
          textAlign: 'center',
        }}
      >
        Chess Opening Tree
      </h1>
      {selectedNode && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#222',
            margin: '1rem',
            borderRadius: '8px',
            width: '80%',
            maxWidth: '1200px',
          }}
        >
          <h3>Selected Opening: {getOpeningName(selectedNode)}</h3>
          <p>
            Path:{' '}
            {selectedNode
              .ancestors()
              .map((d) => d.data.move)
              .reverse()
              .join(' → ')}
          </p>
          <p>
            Move Type:{' '}
            {isWhiteMove(selectedNode.data.move) === true
              ? "White's move"
              : isWhiteMove(selectedNode.data.move) === false
              ? "Black's move"
              : 'Opening name'}
          </p>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: 'calc(100vh - 200px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <svg
          ref={svgRef}
          style={{
            border: '1px solid #444',
            width: '100%',
            height: '100%',
            maxWidth: '1800px',
          }}
        ></svg>
      </div>
    </div>
  );
};

export default ChessTree;
