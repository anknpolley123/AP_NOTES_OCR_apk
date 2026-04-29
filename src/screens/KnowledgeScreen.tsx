
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getNotes, Note } from '../services/storage';
import { Network, Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  x?: number;
  y?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export default function KnowledgeScreen() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getNotes();
    setNotes(data);
  };

  useEffect(() => {
    if (!svgRef.current || notes.length === 0) return;

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Mock connections for visualization if notes don't have explicit links
    // In a real app, you'd extract links from content
    const nodes: Node[] = notes.map(n => ({ id: n.id, title: n.title }));
    const links: Link[] = [];
    
    // Create random or semantic links for demo purposes
    if (nodes.length > 1) {
      for (let i = 1; i < nodes.length; i++) {
        links.push({ 
          source: nodes[Math.floor(Math.random() * i)].id, 
          target: nodes[i].id 
        });
      }
    }

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const g = svg.append("g");

    const link = g.append("g")
      .attr("stroke", "var(--color-blue-600)")
      .attr("stroke-opacity", 0.3)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2);

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", 12)
      .attr("fill", "var(--color-blue-600)")
      .attr("stroke", "rgba(255,255,255,0.2)")
      .attr("stroke-width", 4)
      .style("cursor", "pointer")
      .on("click", (e, d) => navigate(`/editor/${d.id}`));

    node.append("text")
      .text(d => d.title)
      .attr("x", 15)
      .attr("y", 5)
      .attr("fill", "var(--text-main)")
      .style("font-size", "10px")
      .style("font-weight", "900")
      .style("text-transform", "uppercase")
      .style("letter-spacing", "0.05em")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Zoom behavior
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));

  }, [notes, navigate]);

  return (
    <Layout 
      title="KNOWLEDGE" 
      subtitle="GRAPH_VIEW ACTIVE"
      hugeText="MIND\nMAP"
      showBack
    >
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase text-[var(--text-main)]">Knowledge Base</h2>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{notes.length} NODES IDENTIFIED</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-[var(--bg-button)] rounded-lg text-[var(--text-muted)]"><ZoomIn className="w-4 h-4" /></button>
            <button className="p-2 bg-[var(--bg-button)] rounded-lg text-[var(--text-muted)]"><ZoomOut className="w-4 h-4" /></button>
            <button className="p-2 bg-[var(--bg-button)] rounded-lg text-[var(--text-muted)]"><Maximize2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="relative flex-1 bg-[var(--bg-app)]/50 border-2 border-[var(--border-app)] rounded-[32px] overflow-hidden min-h-[600px]">
          <svg 
            ref={svgRef} 
            className="w-full h-full" 
          />
          
          <div className="absolute bottom-4 left-4 right-4 bg-[var(--bg-card)]/80 backdrop-blur-md p-4 rounded-2xl border border-[var(--border-app)] flex items-center gap-3 shadow-xl">
             <Search className="w-4 h-4 text-[var(--text-muted)]" />
             <input 
               type="text" 
               placeholder="SEARCH NODES..." 
               className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-[var(--text-main)] placeholder:text-[var(--text-muted)] flex-1"
             />
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-600 rounded-3xl text-white flex items-center justify-between group cursor-pointer hover:scale-[1.02] transition-all">
          <div>
            <div className="text-[10px] font-black uppercase opacity-60">Insight</div>
            <div className="text-sm font-black uppercase tracking-tight">Generate semantic clusters</div>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
             <Search className="w-5 h-5" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
