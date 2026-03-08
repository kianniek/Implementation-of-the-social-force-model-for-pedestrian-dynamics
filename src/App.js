import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Settings, Play, Pause, RotateCcw, Users, Wall, Info, Map as MapIcon, Maximize2 } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const App = () =>
{
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showVectors, setShowVectors] = useState(false);
  const [agentCount, setAgentCount] = useState(20);

  const [activeMap, setActiveMap] = useState('narrow');
  const [envParams, setEnvParams] = useState({
    corridorWidth: 60,
    slitWidth: 60,
  });

  const [params, setParams] = useState({
    tau: 0.5,
    v0: 1.34,
    v0_std: 0.26,
    V0_ab: 2.1,
    sigma: 0.3,
    U0_aB: 10.0,
    R: 0.2,
    c: 0.5,
    phi: 100,
    maxSpeedMultiplier: 1.3,
    dt: 0.05
  });

  const agentsRef = useRef([]);
  const wallsRef = useRef([]);

  // Box-Muller transform for Gaussian random numbers
  const gaussianRandom = (mean, std) =>
  {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + std * z;
  };

  const initSimulation = () =>
  {
    const width = 800;
    const height = 400;

    updateWalls();

    const agents = [];
    for (let i = 0; i < agentCount; i++) {
      agents.push(createNewAgent(i, width));
    }
    agentsRef.current = agents;
  };

  const createNewAgent = (id, width) =>
  {
    const speed = Math.max(0.1, gaussianRandom(params.v0, params.v0_std));

    if (activeMap === 'crossing') {
      const hw = envParams.corridorWidth / 2;
      const isVertical = id % 2 === 0;
      const direction = (Math.floor(id / 2)) % 2 === 0 ? 1 : -1;
      let x, y;
      if (isVertical) {
        x = 400 + (Math.random() - 0.5) * (hw * 1.2);
        y = direction === 1 ? Math.random() * 60 : 400 - Math.random() * 60;
      } else {
        x = direction === 1 ? Math.random() * 150 : width - Math.random() * 150;
        y = 200 + (Math.random() - 0.5) * (hw * 1.2);
      }
      const colors = { xPos: '#3b82f6', xNeg: '#ef4444', yPos: '#22c55e', yNeg: '#f59e0b' };
      const colorKey = isVertical ? (direction === 1 ? 'yPos' : 'yNeg') : (direction === 1 ? 'xPos' : 'xNeg');
      return {
        id, pos: { x, y },
        vel: isVertical ? { x: 0, y: direction * speed } : { x: direction * speed, y: 0 },
        desiredSpeed: speed, direction, axis: isVertical ? 'y' : 'x',
        color: colors[colorKey],
        forces: { social: { x: 0, y: 0 }, wall: { x: 0, y: 0 }, target: { x: 0, y: 0 } }
      };
    }

    const direction = id % 2 === 0 ? 1 : -1;
    const x = direction === 1 ? Math.random() * 150 : width - Math.random() * 150;
    const y = 120 + Math.random() * 160;

    return {
      id: id,
      pos: { x, y },
      vel: { x: direction * speed, y: 0 },
      desiredSpeed: speed,
      direction: direction,
      axis: 'x',
      color: direction === 1 ? '#3b82f6' : '#ef4444',
      forces: { social: { x: 0, y: 0 }, wall: { x: 0, y: 0 }, target: { x: 0, y: 0 } }
    };
  };

  const updateWalls = () =>
  {
    let walls = [];

    if (activeMap === 'crossing') {
      const cx = 400, cy = 200;
      const hw = envParams.corridorWidth / 2;
      // horizontal corridor walls (left arm, right arm)
      walls.push(
        { x1: 0, y1: cy - hw, x2: cx - hw, y2: cy - hw },
        { x1: 0, y1: cy + hw, x2: cx - hw, y2: cy + hw },
        { x1: cx + hw, y1: cy - hw, x2: 800, y2: cy - hw },
        { x1: cx + hw, y1: cy + hw, x2: 800, y2: cy + hw }
      );
      // vertical corridor walls (top arm, bottom arm)
      walls.push(
        { x1: cx - hw, y1: 0, x2: cx - hw, y2: cy - hw },
        { x1: cx + hw, y1: 0, x2: cx + hw, y2: cy - hw },
        { x1: cx - hw, y1: cy + hw, x2: cx - hw, y2: 400 },
        { x1: cx + hw, y1: cy + hw, x2: cx + hw, y2: 400 }
      );
      wallsRef.current = walls;
      return;
    }

    // default top/bottom boundary for non-crossing maps
    walls.push(
      { x1: 0, y1: 80, x2: 800, y2: 80 },
      { x1: 0, y1: 320, x2: 800, y2: 320 }
    );

    if (activeMap === 'narrow') {
      const centerY = 200;
      const hw = envParams.corridorWidth / 2;
      walls.push(
        { x1: 300, y1: 80, x2: 380, y2: centerY - hw },
        { x1: 300, y1: 320, x2: 380, y2: centerY + hw },
        { x1: 380, y1: centerY - hw, x2: 420, y2: centerY - hw },
        { x1: 380, y1: centerY + hw, x2: 420, y2: centerY + hw },
        { x1: 420, y1: centerY - hw, x2: 500, y2: 80 },
        { x1: 420, y1: centerY + hw, x2: 500, y2: 320 }
      );
    } else if (activeMap === 'centerWall') {
      const centerX = 400;
      const centerY = 200;
      const halfSlit = envParams.slitWidth / 2;
      walls.push(
        { x1: centerX, y1: 80, x2: centerX, y2: centerY - halfSlit },
        { x1: centerX, y1: centerY + halfSlit, x2: centerX, y2: 320 }
      );
    } else if (activeMap === 'boxes') {
      const boxes = [
        { x: 250, y: 120, w: 40, h: 60 },
        { x: 400, y: 220, w: 40, h: 60 },
        { x: 550, y: 120, w: 40, h: 60 },
      ];
      boxes.forEach(b =>
      {
        walls.push(
          { x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y },
          { x1: b.x, y1: b.y + b.h, x2: b.x + b.w, y2: b.y + b.h },
          { x1: b.x, y1: b.y, x2: b.x, y2: b.y + b.h },
          { x1: b.x + b.w, y1: b.y, x2: b.x + b.w, y2: b.y + b.h }
        );
      });
    }
    wallsRef.current = walls;
  };

  useEffect(() =>
  {
    const currentCount = agentsRef.current.length;
    if (agentCount > currentCount) {
      const newAgents = [...agentsRef.current];
      for (let i = currentCount; i < agentCount; i++) {
        newAgents.push(createNewAgent(Date.now() + i, 800));
      }
      agentsRef.current = newAgents;
    } else if (agentCount < currentCount) {
      agentsRef.current = agentsRef.current.slice(0, agentCount);
    }
  }, [agentCount]);

  useEffect(() =>
  {
    agentsRef.current = agentsRef.current.map(a => ({
      ...a,
      desiredSpeed: Math.max(0.1, gaussianRandom(params.v0, params.v0_std))
    }));
  }, [params.v0]);

  useEffect(() =>
  {
    initSimulation();
  }, [activeMap, envParams.corridorWidth, envParams.slitWidth]);

  const updateSimulation = () =>
  {
    if (!isPlaying) return;

    const agents = agentsRef.current;
    const walls = wallsRef.current;

    const newAgents = agents.map(a =>
    {
      let totalForce = { x: 0, y: 0 };

      let dx, dy;
      if (a.axis === 'y') {
        dx = 400 - a.pos.x;
        dy = (a.direction === 1 ? 450 : -50) - a.pos.y;
      } else {
        dx = (a.direction === 1 ? 950 : -150) - a.pos.x;
        dy = 200 - a.pos.y;
      }
      const distToTarget = Math.sqrt(dx * dx + dy * dy);
      const e = { x: dx / distToTarget, y: dy / distToTarget };

      const f_target = {
        x: (1 / params.tau) * (a.desiredSpeed * e.x - a.vel.x),
        y: (1 / params.tau) * (a.desiredSpeed * e.y - a.vel.y)
      };
      totalForce.x += f_target.x;
      totalForce.y += f_target.y;

      let f_social = { x: 0, y: 0 };
      agents.forEach(b =>
      {
        if (a.id === b.id) return;
        const rab = { x: a.pos.x - b.pos.x, y: a.pos.y - b.pos.y };
        const dist = Math.sqrt(rab.x * rab.x + rab.y * rab.y);
        if (dist === 0 || dist > 100) return;

        const strength = params.V0_ab * Math.exp(-dist / (params.sigma * 20));
        const forceDir = { x: rab.x / dist, y: rab.y / dist };
        const dot = (forceDir.x * -a.vel.x + forceDir.y * -a.vel.y);
        const velMag = Math.sqrt(a.vel.x ** 2 + a.vel.y ** 2);
        const cosPhi = Math.cos((params.phi * Math.PI) / 180);
        const weight = (velMag === 0 || dot >= velMag * cosPhi) ? 1.0 : params.c;

        f_social.x += strength * forceDir.x * weight;
        f_social.y += strength * forceDir.y * weight;
      });
      totalForce.x += f_social.x;
      totalForce.y += f_social.y;

      let f_wall = { x: 0, y: 0 };
      walls.forEach(w =>
      {
        const dxW = w.x2 - w.x1;
        const dyW = w.y2 - w.y1;
        const l2 = dxW * dxW + dyW * dyW;
        let t = ((a.pos.x - w.x1) * dxW + (a.pos.y - w.y1) * dyW) / l2;
        t = Math.max(0, Math.min(1, t));
        const proj = { x: w.x1 + t * dxW, y: w.y1 + t * dyW };
        const vecToAgent = { x: a.pos.x - proj.x, y: a.pos.y - proj.y };
        const dist = Math.sqrt(vecToAgent.x * vecToAgent.x + vecToAgent.y * vecToAgent.y);

        if (dist > 0 && dist < 50) {
          const strength = params.U0_aB * Math.exp(-dist / (params.R * 20));
          f_wall.x += strength * (vecToAgent.x / dist);
          f_wall.y += strength * (vecToAgent.y / dist);
        }
      });
      totalForce.x += f_wall.x;
      totalForce.y += f_wall.y;

      const nextVel = {
        x: a.vel.x + totalForce.x * params.dt,
        y: a.vel.y + totalForce.y * params.dt
      };

      const currentSpeed = Math.sqrt(nextVel.x ** 2 + nextVel.y ** 2);
      const limit = a.desiredSpeed * params.maxSpeedMultiplier;
      if (currentSpeed > limit) {
        nextVel.x = (nextVel.x / currentSpeed) * limit;
        nextVel.y = (nextVel.y / currentSpeed) * limit;
      }

      const nextPos = {
        x: a.pos.x + nextVel.x * params.dt * 20,
        y: a.pos.y + nextVel.y * params.dt * 20
      };

      if (a.axis === 'y') {
        if (nextPos.y > 450) nextPos.y = -50;
        if (nextPos.y < -50) nextPos.y = 450;
      } else {
        if (nextPos.x > 850) nextPos.x = -50;
        if (nextPos.x < -50) nextPos.x = 850;
      }

      return { ...a, pos: nextPos, vel: nextVel, forces: { social: f_social, wall: f_wall, target: f_target } };
    });

    agentsRef.current = newAgents;
  };

  useEffect(() =>
  {
    let frame;
    const render = () =>
    {
      updateSimulation();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      wallsRef.current.forEach(w =>
      {
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();
      });

      if (activeMap === 'boxes') {
        ctx.fillStyle = 'rgba(71, 85, 105, 0.1)';
        ctx.fillRect(250, 120, 40, 60);
        ctx.fillRect(400, 220, 40, 60);
        ctx.fillRect(550, 120, 40, 60);
      }

      agentsRef.current.forEach(a =>
      {
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(a.pos.x, a.pos.y, 7, 0, Math.PI * 2);
        ctx.fill();

        if (showVectors) {
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.pos.x, a.pos.y);
          ctx.lineTo(a.pos.x + a.forces.social.x * 10, a.pos.y + a.forces.social.y * 10);
          ctx.stroke();
          ctx.strokeStyle = '#22c55e';
          ctx.beginPath();
          ctx.moveTo(a.pos.x, a.pos.y);
          ctx.lineTo(a.pos.x + a.forces.wall.x * 10, a.pos.y + a.forces.wall.y * 10);
          ctx.stroke();
        }
      });

      frame = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, params, showVectors, activeMap]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 overflow-hidden">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Social Force Model</h1>
          <p className="text-slate-500 text-sm">Based on Helbing & Molnár (1995)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={initSimulation}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl shadow-xl p-4 border border-slate-100 flex items-center justify-center relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="max-w-full h-auto bg-white rounded border border-slate-200"
          />
        </div>

        <aside className="w-full lg:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-6 flex flex-col gap-6 overflow-y-auto">

          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapIcon size={16} /> Environment Parameters
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-medium mb-2 block">Map Scenario</label>
                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={() => setActiveMap('narrow')}
                    className={`text-xs py-2 rounded-md border transition ${activeMap === 'narrow' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >Narrow</button>
                  <button
                    onClick={() => setActiveMap('centerWall')}
                    className={`text-xs py-2 rounded-md border transition ${activeMap === 'centerWall' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >Slit</button>
                  <button
                    onClick={() => setActiveMap('crossing')}
                    className={`text-xs py-2 rounded-md border transition ${activeMap === 'crossing' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >Crossing</button>
                  <button
                    onClick={() => setActiveMap('boxes')}
                    className={`text-xs py-2 rounded-md border transition ${activeMap === 'boxes' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >Boxes</button>
                  <button
                    onClick={() => setActiveMap('open')}
                    className={`text-xs py-2 rounded-md border transition ${activeMap === 'open' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >Open</button>
                </div>
              </div>

              {(activeMap === 'narrow' || activeMap === 'crossing') && (
                <div>
                  <label className="text-sm flex justify-between items-center mb-1">
                    Corridor Width: <span>{envParams.corridorWidth}px</span>
                  </label>
                  <input type="range" min="20" max="150" step="5" value={envParams.corridorWidth}
                    onChange={e => setEnvParams({ ...envParams, corridorWidth: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}

              {activeMap === 'centerWall' && (
                <div>
                  <label className="text-sm flex justify-between items-center mb-1">
                    Slit Width: <span>{envParams.slitWidth}px</span>
                  </label>
                  <input type="range" min="20" max="200" step="5" value={envParams.slitWidth}
                    onChange={e => setEnvParams({ ...envParams, slitWidth: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}

              <div>
                <label className="text-sm flex justify-between items-center mb-1">
                  Agent Count:
                </label>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <input
                    type="number" min="1" max="150" value={agentCount}
                    onChange={e => setAgentCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings size={16} /> Social Force Parameters
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm flex justify-between">
                  Relaxation (<InlineMath math="\\tau" />): <span>{params.tau}s</span>
                </label>
                <input type="range" min="0.1" max="2" step="0.1" value={params.tau}
                  onChange={e => setParams({ ...params, tau: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="text-sm flex justify-between">
                  Repulsion Strength (<InlineMath math="V^0_{ab}" />): <span>{params.V0_ab}</span>
                </label>
                <input type="range" min="0" max="10" step="0.5" value={params.V0_ab}
                  onChange={e => setParams({ ...params, V0_ab: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="text-sm flex justify-between">
                  Wall Strength (<InlineMath math="U^0_{aB}" />): <span>{params.U0_aB}</span>
                </label>
                <input type="range" min="0" max="30" step="1" value={params.U0_aB}
                  onChange={e => setParams({ ...params, U0_aB: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="text-sm flex justify-between">
                  Desired Speed (<InlineMath math="v^0_\\alpha" />): <span>{params.v0} m/s</span>
                </label>
                <input type="range" min="0.5" max="3.0" step="0.1" value={params.v0}
                  onChange={e => setParams({ ...params, v0: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="text-sm flex justify-between">
                  Rear Perception (<InlineMath math="c" />): <span>{params.c}</span>
                </label>
                <p className="text-xs text-slate-400 mb-1">Influence weight for stimuli outside the field of view (0 = ignore, 1 = full)</p>
                <input type="range" min="0" max="1" step="0.05" value={params.c}
                  onChange={e => setParams({ ...params, c: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVectors}
                    onChange={e => setShowVectors(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium">Show Force Vectors</span>
                </label>
              </div>
            </div>
          </section>

          <section className="mt-auto p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-blue-800 font-semibold text-sm mb-2 flex items-center gap-2">
              <Info size={14} /> Simulation Logic
            </h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Adjusting <strong>Agent Count</strong> now adds or removes agents without resetting the whole scene.
              <strong>Narrow Corridor</strong> width changes will still reset the scene to ensure correct initial positioning inside the new geometry.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default App;