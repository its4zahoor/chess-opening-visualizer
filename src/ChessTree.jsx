import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import openingData from './openings.json';

// Helper function to get a unique path string for a node
const getNodePath = (d) =>
  d
    .ancestors()
    .map((x) => x.data.move)
    .reverse()
    .join('/');

// Helper function to compare node to selectedNode by unique path
const isSameNode = (a, selectedNode) =>
  a && selectedNode && getNodePath(a) === getNodePath(selectedNode);

const ChessTree = () => {
  const svgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const tooltipTimeoutRef = useRef(null);

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

  // Calculate tree layout whenever relevant state changes
  useEffect(() => {
    const margin = { top: 80, right: 80, bottom: 80, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const treeLayout = d3.tree().nodeSize([70, 220]).size([height, width]);
    const root = d3.hierarchy(openingData);

    // Handle collapsed nodes
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

    // Calculate initial transform to center the tree
    const nodes = root.descendants();
    const minX = Math.min(...nodes.map((d) => d.x));
    const maxX = Math.max(...nodes.map((d) => d.x));
    const minY = Math.min(...nodes.map((d) => d.y));
    const maxY = Math.max(...nodes.map((d) => d.y));

    const treeWidth = maxY - minY;
    const treeHeight = maxX - minX;

    const scale =
      Math.min(
        (dimensions.width - margin.left - margin.right) / treeWidth,
        (dimensions.height - margin.top - margin.bottom) / treeHeight
      ) * 0.8; // 80% of the available space

    const initialX = (dimensions.width - treeWidth * scale) / 2 - minY * scale;
    const initialY =
      (dimensions.height - treeHeight * scale) / 2 - minX * scale;

    setTransform({ x: initialX, y: initialY, k: scale });
    setTreeData(root);
  }, [dimensions, collapsedNodes]);

  // Setup zoom behavior
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        setTransform(event.transform);
      });

    svg.call(zoom);
  }, []);

  // Helper function to get node colors
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
        border: '#eee', // White border for black nodes
        hover: '#43a047',
      };
    }
  };

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

  // Handle node click
  const handleNodeClick = (event, d) => {
    event.stopPropagation();
    if (isSameNode(d, selectedNode)) {
      if (d.children || d._children) {
        toggleNode(d);
      }
      return;
    }
    if (d.children || d._children) {
      toggleNode(d);
    }
    setSelectedNode(d);
  };

  // Handle node hover
  const handleNodeHover = (event, d) => {
    setHoveredNode(d);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
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
    }, 150);
  };

  // Handle node hover out
  const handleNodeHoverOut = () => {
    setHoveredNode(null);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    d3.selectAll('.tooltip').remove();
  };

  if (!treeData) return null;

  // Calculate selected and hovered paths
  const selectedPathMoves = new Set();
  if (selectedNode) {
    selectedNode.ancestors().forEach((d) => {
      selectedPathMoves.add(getNodePath(d));
    });
  }

  const hoveredPathMoves = new Set();
  if (hoveredNode) {
    hoveredNode.ancestors().forEach((d) => {
      hoveredPathMoves.add(getNodePath(d));
    });
  }

  return (
    <div
      className='min-h-screen w-screen overflow-x-hidden flex flex-col items-center p-0 m-0 bg-gradient-to-br from-slate-100 to-slate-400'
      onClick={() => setSelectedNode(null)}
    >
      {selectedNode && (
        <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-white m-0 rounded-lg w-full max-w-3xl text-gray-900 shadow-md flex flex-col items-center flex-wrap gap-4'>
          <span className='font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis'>
            {getOpeningName(selectedNode)}
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
          className='border-none w-screen h-screen block relative z-10'
        >
          <defs>
            <filter
              id='selected-glow'
              x='-50%'
              y='-50%'
              width='200%'
              height='200%'
            >
              <feDropShadow
                dx='0'
                dy='0'
                stdDeviation='4'
                floodColor='#43a047'
                floodOpacity='0.7'
              />
            </filter>
            <filter id='path-glow' x='-50%' y='-50%' width='200%' height='200%'>
              <feDropShadow
                dx='0'
                dy='0'
                stdDeviation='4'
                floodColor='#e53935'
                floodOpacity='0.7'
              />
            </filter>
          </defs>
          <g
            transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
          >
            {/* Render links */}
            {treeData.links().map((link, i) => {
              const isInSelectedPath =
                selectedPathMoves.has(getNodePath(link.source)) &&
                selectedPathMoves.has(getNodePath(link.target));
              const isInHoveredPath =
                hoveredPathMoves.has(getNodePath(link.source)) &&
                hoveredPathMoves.has(getNodePath(link.target));

              const path = d3
                .linkHorizontal()
                .x((d) => d.y)
                .y((d) => d.x)(link);

              return (
                <path
                  key={i}
                  className='link'
                  d={path}
                  fill='none'
                  stroke={
                    isInHoveredPath
                      ? '#fbbf24'
                      : isInSelectedPath
                      ? '#e53935'
                      : '#222'
                  }
                  strokeWidth={isInHoveredPath ? 7 : isInSelectedPath ? 8 : 4}
                />
              );
            })}

            {/* Render nodes */}
            {treeData.descendants().map((d, i) => {
              const colors = getNodeColors(d.data.move);
              const isSelected = isSameNode(d, selectedNode);
              const isInSelectedPath = selectedPathMoves.has(getNodePath(d));
              const isInHoveredPath = hoveredPathMoves.has(getNodePath(d));

              return (
                <g
                  key={i}
                  className='node'
                  transform={`translate(${d.y},${d.x})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleNodeClick(e, d)}
                  onMouseOver={(e) => handleNodeHover(e, d)}
                  onMouseOut={handleNodeHoverOut}
                >
                  <circle
                    r={
                      isSelected
                        ? 24
                        : isInHoveredPath
                        ? 20
                        : isInSelectedPath
                        ? 18
                        : 13
                    }
                    fill={
                      isSelected
                        ? '#9c27b0'
                        : isInHoveredPath
                        ? '#fbbf24'
                        : colors.circle
                    }
                    stroke={
                      isInHoveredPath
                        ? '#fbbf24'
                        : isInSelectedPath
                        ? '#e53935'
                        : colors.border
                    }
                    strokeWidth={
                      isSelected
                        ? 6
                        : isInHoveredPath
                        ? 5
                        : isInSelectedPath
                        ? 4
                        : 3
                    }
                    filter={
                      isSelected
                        ? 'url(#selected-glow)'
                        : isInHoveredPath || isInSelectedPath
                        ? 'url(#path-glow)'
                        : null
                    }
                  />
                  <text
                    x={0}
                    dy={28}
                    textAnchor='middle'
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      paintOrder: 'stroke',
                      stroke: colors.text === '#fff' ? '#111' : '#fff',
                      strokeWidth: 3,
                      strokeLinejoin: 'round',
                      fill: colors.text,
                      userSelect: 'none',
                    }}
                  >
                    {d._children ? '+' : d.children ? '-' : ''}{' '}
                    {getMoveDisplay(d.data.move)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default ChessTree;
